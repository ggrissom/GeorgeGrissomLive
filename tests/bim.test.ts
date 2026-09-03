import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import Stripe from "stripe";
import {BimStore,rateLimit,stripeClient} from "../src/lib/bim/service";
import {decrypt,encrypt} from "../src/lib/bim/crypto";
import {suite,productById} from "../src/lib/bim/catalog";
import type {Database} from "../src/lib/bim/db";

process.env.BIM_LICENSE_ENCRYPTION_KEY="12".repeat(32);
process.env.BIM_RELEASE_VERSION="test-v1";
process.env.BIM_SITE_URL="https://store.example";
process.env.BIM_STRIPE_PRICE_MAP=JSON.stringify({"cennerit":"price_cennerit","launch-suite":"price_launch-suite"});

async function fixture(){
 const db=new PGlite();await db.exec(await readFile("db/bim.sql","utf8"));
 await db.query("INSERT INTO bim_releases(version,archive,sha256,features) VALUES($1,$2,$3,$4)",["test-v1",Buffer.from("private ZIP"),"archive-sha",suite.features]);
 let sequence=0;let createArgs:Record<string,unknown>={};
 const sessions=new Map<string,Record<string,unknown>>();
 const stripe={
  prices:{retrieve:async(id:string)=>{const product=productById(id.replace("price_",""))!;return {id,active:true,livemode:false,currency:"usd",unit_amount:product.price,type:"one_time",metadata:{bim_product:product.id}};}},
  checkout:{sessions:{create:async(args:Record<string,unknown>)=>{createArgs=args;const id=`cs_test_${++sequence}`;const product=productById((args.metadata as {bim_product:string}).bim_product)!;
    const session={...args,id,livemode:false,payment_status:"unpaid",amount_total:product.price,currency:"usd",payment_intent:`pi_test_${sequence}`,customer_details:{email:"buyer@example.test"},line_items:{data:[{quantity:1,price:{id:`price_${product.id}`}}]},url:`https://checkout.stripe.com/c/pay/${id}`};sessions.set(id,session);return session;},retrieve:async(id:string)=>sessions.get(id)}}
 } as unknown as Stripe;
 const service=new BimStore(db as unknown as Database,stripe,false);
 return {db,service,stripe,sessions,get args(){return createArgs;},async paid(product="cennerit"){const checkout=await service.checkout(product);const session=[...sessions.values()].at(-1)!;session.payment_status="paid";await service.fulfill(session.id as string);return {checkout,session,receipt:await service.receipt(checkout.id,checkout.receipt)};}};
}

test("suite and individual payments create real SQL records, unique keys, and gated downloads",async()=>{
 const f=await fixture();try{
  const individual=await f.paid();const bundle=await f.paid("launch-suite");
  assert.notEqual(individual.receipt.key,bundle.receipt.key);assert.match(individual.receipt.key!,/^BG-/);
  assert.equal((await f.db.query("SELECT * FROM bim_orders WHERE status='paid'")).rows.length,2);
  assert.equal(Buffer.from((await f.service.download(individual.receipt.key!)).archive).toString(),"private ZIP");
  await assert.rejects(f.service.download("BG-FORGED"),/valid paid/);
  assert.equal(f.args.payment_method_types,undefined,"dynamic payment methods are preserved");
 }finally{await f.db.close();}
});
test("redirect IDs and unpaid sessions cannot unlock a license",async()=>{
 const f=await fixture();try{const c=await f.service.checkout("cennerit");assert.equal((await f.service.receipt(c.id,c.receipt)).key,null);await assert.rejects(f.service.receipt(c.id,"stolen-or-guessed"),/browser used/);assert.equal((await f.db.query("SELECT * FROM bim_orders WHERE status='paid'")).rows.length,0);}finally{await f.db.close();}
});
test("duplicate and simultaneous webhook fulfillment retains exactly one key",async()=>{
 const f=await fixture();try{const c=await f.service.checkout("cennerit");const session=[...f.sessions.values()][0];session.payment_status="paid";await Promise.all([f.service.fulfill(session.id as string),f.service.fulfill(session.id as string)]);const first=await f.service.receipt(c.id,c.receipt);await f.service.fulfill(session.id as string);assert.equal((await f.service.receipt(c.id,c.receipt)).key,first.key);assert.equal((await f.db.query("SELECT * FROM bim_orders WHERE key_hash IS NOT NULL")).rows.length,1);}finally{await f.db.close();}
});
test("database enforces entitlement, repeat activation, and two-machine limit",async()=>{
 const f=await fixture();try{const p=await f.paid();const key=p.receipt.key!;
  await assert.rejects(f.service.activate(key,"1".repeat(64),"datalink"),/does not include/);
  const outcomes=await Promise.allSettled([1,2,3].map(n=>f.service.activate(key,String(n).repeat(64),"cennerit")));
  assert.equal(outcomes.filter(r=>r.status==="fulfilled").length,2);assert.equal(outcomes.filter(r=>r.status==="rejected").length,1);
  await f.service.activate(key,"1".repeat(64),"cennerit");assert.equal((await f.db.query("SELECT * FROM bim_activations")).rows.length,2);
  await assert.rejects(new BimStore(f.db as unknown as Database,f.stripe,true).activate(key,"1".repeat(64),"cennerit"),/not active/);
 }finally{await f.db.close();}
});
test("refunds revoke existing access and refunds arriving first prevent later fulfillment",async()=>{
 const f=await fixture();try{const p=await f.paid();await f.service.revoke(p.session.payment_intent as string,"refund");await assert.rejects(f.service.download(p.receipt.key!),/valid paid/);await assert.rejects(f.service.activate(p.receipt.key!,"1".repeat(64),"cennerit"),/not active/);
  const c=await f.service.checkout("cennerit");const s=[...f.sessions.values()].at(-1)!;await f.service.revoke(s.payment_intent as string,"refund");s.payment_status="paid";await f.service.fulfill(s.id as string);assert.equal((await f.service.receipt(c.id,c.receipt)).status,"revoked");
 }finally{await f.db.close();}
});
test("wrong amount, wrong mode, wrong item, and unverified release fail closed",async()=>{
 const f=await fixture();try{
  const c=await f.service.checkout("cennerit");const s=[...f.sessions.values()][0];s.payment_status="paid";s.amount_total=1;
  await assert.rejects(f.service.fulfill(s.id as string),/did not match/);s.amount_total=900;s.livemode=true;await f.service.fulfill(s.id as string);assert.equal((await f.db.query<{status:string}>("SELECT status FROM bim_orders WHERE id=$1",[c.id])).rows[0].status,"pending");
  s.livemode=false;s.line_items={data:[{quantity:1,price:{id:"price_other"}}]};await assert.rejects(f.service.fulfill(s.id as string),/did not match/);
  await assert.rejects(new BimStore(f.db as unknown as Database,f.stripe,true).checkout("cennerit"),/verification/);
  await assert.rejects(f.service.checkout("ghostly-transmission"),/not in the launch/);
 }finally{await f.db.close();}
});
test("rate limits are durable and encrypted keys reject tampering",async()=>{
 const f=await fixture();try{await rateLimit(f.db as unknown as Database,"activation-ip",2);await rateLimit(f.db as unknown as Database,"activation-ip",2);await assert.rejects(rateLimit(f.db as unknown as Database,"activation-ip",2),/Too many/);const value=encrypt("BG-PRIVATE");assert.equal(decrypt(value),"BG-PRIVATE");const parts=value.split(".");parts[2]=Buffer.from("tampered").toString("base64url");assert.throws(()=>decrypt(parts.join(".")));}finally{await f.db.close();}
});
test("Stripe signatures reject forged webhook bodies and live mode needs explicit approval",()=>{
 const stripe=new Stripe("sk_test_placeholder");const payload=JSON.stringify({id:"evt_test",object:"event",type:"checkout.session.completed",livemode:false,data:{object:{id:"cs_test"}}});const signature=stripe.webhooks.generateTestHeaderString({payload,secret:"whsec_local_unit_test"});
 assert.equal(stripe.webhooks.constructEvent(payload,signature,"whsec_local_unit_test").id,"evt_test");assert.throws(()=>stripe.webhooks.constructEvent(payload+" ",signature,"whsec_local_unit_test"));
 process.env.BIM_PAYMENT_MODE="live";process.env.BIM_STRIPE_SECRET_KEY="sk_live_placeholder";delete process.env.BIM_LIVE_APPROVED;assert.throws(stripeClient,/verification/);process.env.BIM_PAYMENT_MODE="test";delete process.env.BIM_STRIPE_SECRET_KEY;
});
