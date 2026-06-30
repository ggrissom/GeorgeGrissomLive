import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const amountCents = Math.max(25, Number(body.amountCents || 25));
  const type = String(body.type || "tip");

  if (!process.env.STRIPE_SECRET_KEY) {
    const payment = await prisma.payment.create({
      data: { type, amountCents, status: "demo_no_stripe", metadata: body }
    });
    return NextResponse.json({ demoMode: true, payment, message: "Stripe is not configured. Payment recorded in demo/manual mode." });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: body.label || "George Grissom Live" },
        unit_amount: amountCents
      },
      quantity: 1
    }],
    success_url: `${site}/?paid=1&type=${encodeURIComponent(type)}`,
    cancel_url: `${site}/?canceled=1`,
    metadata: { type, ...body.metadata }
  });

  await prisma.payment.create({
    data: { type, amountCents, status: "created", stripeSessionId: session.id, metadata: body.metadata || {} }
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
