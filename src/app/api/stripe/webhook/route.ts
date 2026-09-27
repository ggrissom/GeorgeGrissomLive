import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fulfillCheckoutSession } from "@/lib/stripe-fulfillment";
import { isFulfillmentEventType } from "@/lib/stripe-fulfillment-policy";

export const runtime = "nodejs";

function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function signingSecret() {
  if (process.env.STRIPE_WEBHOOK_SECRET) return process.env.STRIPE_WEBHOOK_SECRET;

  const stored = await prisma.payment.findFirst({
    where: { type: "_system_stripe_webhook_secret", status: "active" },
    orderBy: { createdAt: "desc" },
    select: { metadata: true }
  });
  const secret = metadataObject(stored?.metadata).secret;
  return typeof secret === "string" && secret.startsWith("whsec_") ? secret : null;
}

export async function POST(request: Request) {
  const secret = await signingSecret();
  if (!secret) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  }

  const Stripe = (await import("stripe")).default;
  // Signature verification does not call Stripe's API. Digital fulfillment therefore
  // does not depend on the stale STRIPE_SECRET_KEY currently present in Vercel.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_webhook_verification_only");
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook error" },
      { status: 400 }
    );
  }

  if (isFulfillmentEventType(event.type)) {
    await fulfillCheckoutSession(event.data.object as any);
  }

  return NextResponse.json({ received: true });
}
