import { NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/stripe-fulfillment";
import { isFulfillmentEventType } from "@/lib/stripe-fulfillment-policy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
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
