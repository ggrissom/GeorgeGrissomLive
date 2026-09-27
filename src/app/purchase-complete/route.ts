import { NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/stripe-fulfillment";
import { isPaidCheckoutSession } from "@/lib/stripe-fulfillment-policy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  const site = process.env.NEXT_PUBLIC_SITE_URL || url.origin;

  if (!sessionId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(`${site}/?purchase=error`);
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session: any = await stripe.checkout.sessions.retrieve(sessionId);

  if (!isPaidCheckoutSession(session)) {
    return NextResponse.redirect(`${site}/?purchase=error`);
  }

  // Webhooks remain the canonical fulfillment path. This shared, idempotent
  // fallback prevents a fast Checkout redirect from racing the webhook.
  const result = await fulfillCheckoutSession(session);
  if (!result.fulfilled) {
    return NextResponse.redirect(`${site}/?purchase=error`);
  }

  const sku = session.metadata?.sku || "";
  const songSlug = session.metadata?.songSlug || "";
  const params = new URLSearchParams({ purchase: "success" });
  if (sku) params.set("sku", sku);
  if (songSlug) params.set("song", songSlug);

  return NextResponse.redirect(`${site}/?${params.toString()}`);
}
