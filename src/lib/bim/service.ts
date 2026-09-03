import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { productById } from "./catalog";
import { activationKey, decrypt, encrypt, equalSecret, hash, normalizeKey, secret } from "./crypto";
import type { Database } from "./db";

export class StoreError extends Error { constructor(message: string, public status = 400) { super(message); } }
export type Order = {
  id: string; product_id: string; price_id: string; features: string[]; amount: number; currency: string;
  receipt_hash: string; session_id: string | null; livemode: boolean; release_version: string;
  status: "pending" | "paid" | "revoked"; key_cipher: string | null;
};
export function liveMode() { return process.env.BIM_PAYMENT_MODE === "live"; }
export function stripeClient() {
  const key = process.env.BIM_STRIPE_SECRET_KEY || "";
  if (!key.startsWith(liveMode() ? "sk_live_" : "sk_test_")) throw new StoreError("Checkout is not available yet.", 503);
  if (liveMode() && process.env.BIM_LIVE_APPROVED !== "true") throw new StoreError("Sales are awaiting release verification.", 503);
  if (liveMode() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.BIM_SUPPORT_EMAIL || "")) throw new StoreError("Support setup is awaiting verification.", 503);
  return new Stripe(key);
}
export function siteUrl() {
  if (!process.env.BIM_SITE_URL) throw new StoreError("Store URL is not configured.", 503);
  const url = new URL(process.env.BIM_SITE_URL);
  if (liveMode() && url.protocol !== "https:") throw new StoreError("Live checkout requires HTTPS.", 503);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new StoreError("Store URL is not configured.", 503);
  return url.origin;
}
export function configuredPrice(id: string): string {
  const prices = JSON.parse(process.env.BIM_STRIPE_PRICE_MAP || "{}");
  if (typeof prices[id] !== "string" || !prices[id].startsWith("price_")) throw new StoreError("This product is not available for checkout yet.", 503);
  return prices[id];
}
export class BimStore {
  constructor(private db: Database, private stripe: Stripe, private live = liveMode()) {}

  async checkout(productId: string) {
    const origin = siteUrl();
    const product = productById(productId);
    if (!product || product.status !== "candidate") throw new StoreError("This tool is not in the launch collection.");
    const version = process.env.BIM_RELEASE_VERSION;
    const release = (await this.db.query<{features:string[];runtime_verified:boolean}>(
      "SELECT features,runtime_verified FROM bim_releases WHERE version=$1", [version])).rows[0];
    if (!release || !product.features.every(f => release.features.includes(f)) || (this.live && !release.runtime_verified))
      throw new StoreError("The download is awaiting release verification.", 503);
    const priceId = configuredPrice(productId);
    const price = await this.stripe.prices.retrieve(priceId);
    if (!price.active || price.livemode !== this.live || price.currency !== "usd" || price.unit_amount !== product.price || price.type !== "one_time" || price.metadata.bim_product !== product.id)
      throw new StoreError("This product's checkout configuration needs attention.", 503);
    const id = randomUUID(); const receipt = secret();
    await this.db.query("INSERT INTO bim_orders(id,product_id,features,amount,receipt_hash,livemode,release_version,price_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, product.id, product.features, product.price, hash(receipt), this.live, version, priceId]);
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment", line_items: [{price:priceId,quantity:1}],
      customer_creation: "always", client_reference_id: id,
      metadata: { bim_order: id, bim_product: product.id, bim_terms: "2026-09-03" },
      payment_intent_data: { metadata: { bim_order: id, bim_product: product.id } },
      success_url: `${origin}/bim/receipt?order=${id}`,
      cancel_url: `${origin}/bim?checkout=cancelled#collection`,
      // Omit payment_method_types so Stripe selects eligible dynamic methods.
    }, {idempotencyKey:`bim-checkout-${id}`});
    await this.db.query("UPDATE bim_orders SET session_id=$1 WHERE id=$2",[session.id,id]);
    if (!session.url) throw new StoreError("Checkout could not be opened. Please try again.",503);
    return {id,receipt,url:session.url};
  }

  async fulfill(sessionId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId, {expand:["line_items"]});
    if (session.mode !== "payment" || session.livemode !== this.live || session.payment_status !== "paid") return;
    const id = session.metadata?.bim_order;
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) return;
    const order = (await this.db.query<Order>("SELECT * FROM bim_orders WHERE id=$1",[id])).rows[0];
    if (!order || order.status !== "pending") return;
    const items = session.line_items?.data;
    if (order.livemode !== this.live || (order.session_id && order.session_id !== sessionId) || session.client_reference_id !== id ||
      session.metadata?.bim_product !== order.product_id || session.amount_total !== order.amount || session.currency !== order.currency ||
      items?.length !== 1 || items[0].quantity !== 1 || items[0].price?.id !== order.price_id)
      throw new StoreError("Payment did not match the recorded order.");
    const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (!intent) throw new StoreError("Payment reference missing.");
    const key = activationKey();
    // Atomic update: duplicate or concurrent events cannot create a second key.
    await this.db.query(`UPDATE bim_orders SET session_id=$1,payment_intent=$2,email=$3,key_hash=$4,key_cipher=$5,
      status=CASE WHEN EXISTS(SELECT 1 FROM bim_revocations WHERE payment_intent=$2) THEN 'revoked' ELSE 'paid' END,paid_at=now()
      WHERE id=$6 AND status='pending'`,[session.id,intent,session.customer_details?.email || null,hash(key),encrypt(key),id]);
    // Catch a refund that raced the fulfillment update.
    await this.db.query("UPDATE bim_orders SET status='revoked' WHERE id=$1 AND payment_intent IN (SELECT payment_intent FROM bim_revocations)",[id]);
  }

  async revoke(paymentIntent: string, reason: string) {
    await this.db.query("INSERT INTO bim_revocations(payment_intent,reason) VALUES($1,$2) ON CONFLICT DO NOTHING",[paymentIntent,reason]);
    await this.db.query("UPDATE bim_orders SET status='revoked' WHERE payment_intent=$1",[paymentIntent]);
  }

  async receipt(id: string, token: string) {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new StoreError("Receipt unavailable.",404);
    let order = (await this.db.query<Order>("SELECT * FROM bim_orders WHERE id=$1",[id])).rows[0];
    if (!order || !equalSecret(token,order.receipt_hash) || order.livemode !== this.live) throw new StoreError("Open this receipt in the browser used for checkout, or use your activation key on the Downloads page.",403);
    if (order.status === "pending" && order.session_id) {
      await this.fulfill(order.session_id);
      order = (await this.db.query<Order>("SELECT * FROM bim_orders WHERE id=$1",[id])).rows[0];
    }
    return {id:order.id,status:order.status,product:productById(order.product_id)?.name,
      key:order.status === "paid" && order.key_cipher ? decrypt(order.key_cipher) : null};
  }

  async download(key: string) {
    const row = (await this.db.query<{archive:Buffer;sha256:string;version:string}>(`SELECT r.archive,r.sha256,r.version
      FROM bim_orders o JOIN bim_releases r ON r.version=o.release_version
      WHERE o.key_hash=$1 AND o.status='paid' AND o.livemode=$2`,[hash(normalizeKey(key)),this.live])).rows[0];
    if (!row) throw new StoreError("A valid paid activation key is required.",403);
    return row;
  }

  async activate(key: string,machine: string,feature: string) {
    if (!/^[a-z0-9-]{1,60}$/.test(feature) || !/^[a-f0-9]{64}$/.test(machine) || key.length > 100) throw new StoreError("Invalid activation request.");
    const result = (await this.db.query<{result:string}>("SELECT bim_activate($1,$2,$3,$4) AS result",[hash(normalizeKey(key)),hash(machine),feature,this.live])).rows[0].result;
    const messages: Record<string,string> = { invalid_license:"This key is not active. Check your key or contact support.", not_entitled:"This key does not include this tool.", activation_limit:"This key is already active on two computers. Contact support to move an activation." };
    if (result !== "active") throw new StoreError(messages[result] || "Activation unavailable.",403);
    return {valid:true,feature,mode:this.live?"live":"test"};
  }
}

export async function rateLimit(db: Database, bucket: string, limit: number) {
  const result = await db.query<{hits:number}>(`INSERT INTO bim_rate_limits(bucket,hits,expires_at) VALUES($1,1,now()+interval '1 minute')
    ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN bim_rate_limits.expires_at<now() THEN 1 ELSE bim_rate_limits.hits+1 END,
    expires_at=CASE WHEN bim_rate_limits.expires_at<now() THEN now()+interval '1 minute' ELSE bim_rate_limits.expires_at END RETURNING hits`,[hash(bucket)]);
  if (result.rows[0].hits > limit) throw new StoreError("Too many attempts. Please wait a minute.",429);
}
