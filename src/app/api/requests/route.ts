import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get("admin") === "1" && await isAdminRequest();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requests = await prisma.request.findMany({
    include: { song: true, event: true },
    orderBy: [{ status: "asc" }, { priorityScore: "desc" }, { createdAt: "asc" }]
  });
  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const body = await request.json();
  const tipAmountCents = Math.max(0, Number(body.tipAmountCents || 0));
  const priorityScore = tipAmountCents + (body.promoteUrl ? 500 : 0);

  const created = await prisma.request.create({
    data: {
      eventId: body.eventId || null,
      songId: body.songId || null,
      customSongTitle: body.customSongTitle || null,
      requesterName: body.requesterName || null,
      message: body.message || null,
      tipAmountCents,
      priorityScore,
      paymentStatus: process.env.STRIPE_SECRET_KEY && tipAmountCents > 0 ? "pending_stripe" : "manual_or_demo"
    }
  });

  if (process.env.STRIPE_SECRET_KEY && tipAmountCents > 0) {
    const checkout = await createCheckout(created.id, tipAmountCents, "Song request tip");
    return NextResponse.json({ request: created, checkoutUrl: checkout.url });
  }

  return NextResponse.json({ request: created, demoMode: true });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const updated = await prisma.request.update({
    where: { id: body.id },
    data: {
      status: body.status,
      paymentStatus: body.paymentStatus
    }
  });
  return NextResponse.json(updated);
}

async function createCheckout(requestId: string, amountCents: number, label: string) {
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: label },
        unit_amount: amountCents
      },
      quantity: 1
    }],
    success_url: `${site}/?paid=1`,
    cancel_url: `${site}/?canceled=1`,
    metadata: { requestId, type: "request_tip" }
  });
  await prisma.request.update({ where: { id: requestId }, data: { stripeSessionId: session.id } });
  await prisma.payment.create({
    data: {
      type: "request_tip",
      amountCents,
      status: "created",
      stripeSessionId: session.id,
      requestId
    }
  });
  return session;
}
