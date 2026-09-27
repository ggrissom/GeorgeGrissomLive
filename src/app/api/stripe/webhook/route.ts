import { NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/stripe-fulfillment";
import { isFulfillmentEventType } from "@/lib/stripe-fulfillment-policy";
import { stripeWebhookSigningSecret } from "@/lib/stripe-webhook-secret";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = stripeWebhookSigningSecret();
  if (!secret) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  }

  const Stripe = (await import("stripe")).default;
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
