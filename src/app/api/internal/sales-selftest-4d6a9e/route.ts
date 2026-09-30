import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripeWebhookSigningSecret } from "@/lib/stripe-webhook-secret";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const stamp = Date.now();
  const visitorId = `sales-selftest-${stamp}`;
  const sessionId = `cs_sales_selftest_${stamp}`;
  const eventId = `evt_sales_selftest_${stamp}`;
  const slug = "one-question";

  try {
    const song = await prisma.song.findUnique({ where: { slug } });
    if (!song) return NextResponse.json({ ok: false, error: "Self-test song missing" });

    const secret = await stripeWebhookSigningSecret();
    if (!secret) return NextResponse.json({ ok: false, error: "Webhook secret unavailable" });

    const payload = JSON.stringify({
      id: eventId,
      object: "event",
      api_version: "2024-10-28.acacia",
      created: Math.floor(Date.now() / 1000),
      livemode: true,
      pending_webhooks: 1,
      type: "checkout.session.completed",
      data: {
        object: {
          id: sessionId,
          object: "checkout.session",
          payment_status: "paid",
          amount_total: 200,
          client_reference_id: visitorId,
          customer_details: { email: "sales-selftest@example.invalid" },
          metadata: {
            type: "song_download",
            sku: "track:one-question",
            songSlug: slug
          }
        }
      }
    });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_selftest");
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const origin = new URL(request.url).origin;

    const webhook = await fetch(`${origin}/api/stripe/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature
      },
      body: payload,
      cache: "no-store"
    });
    const webhookText = await webhook.text();

    const entitlement = await prisma.songPurchase.findUnique({
      where: { visitorId_songId: { visitorId, songId: song.id } }
    });

    const download = await fetch(`${origin}/api/download/${slug}`, {
      headers: { cookie: `gg_visitor=${encodeURIComponent(visitorId)}` },
      cache: "no-store"
    });
    const downloadStatus = download.status;
    const contentType = download.headers.get("content-type");
    const contentDisposition = download.headers.get("content-disposition");
    if (download.body) await download.body.cancel();

    await prisma.songPurchase.deleteMany({ where: { stripeSessionId: sessionId } });
    await prisma.payment.deleteMany({ where: { stripeSessionId: sessionId } });

    return NextResponse.json({
      ok: webhook.status === 200 && Boolean(entitlement) && downloadStatus === 200,
      webhookStatus: webhook.status,
      webhookResponse: webhookText,
      entitlementCreated: Boolean(entitlement),
      downloadStatus,
      contentType,
      contentDisposition,
      cleanup: true
    });
  } catch (error) {
    try {
      await prisma.songPurchase.deleteMany({ where: { stripeSessionId: sessionId } });
      await prisma.payment.deleteMany({ where: { stripeSessionId: sessionId } });
    } catch {}
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Self-test failed",
      cleanupAttempted: true
    });
  }
}
