import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function grantSongPurchase(session: any) {
  if (session.metadata?.type !== "song_download") return;
  const visitorId = session.metadata?.visitorId;
  const songId = session.metadata?.songId;
  if (!visitorId || !songId) return;

  await prisma.songPurchase.upsert({
    where: { visitorId_songId: { visitorId, songId } },
    update: {
      stripeSessionId: session.id,
      amountCents: Number(session.amount_total || 200),
      customerEmail: session.customer_details?.email || null
    },
    create: {
      visitorId,
      songId,
      stripeSessionId: session.id,
      amountCents: Number(session.amount_total || 200),
      customerEmail: session.customer_details?.email || null
    }
  });
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ skipped: true, reason: "Stripe not configured" });
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
    return NextResponse.json({ error: err instanceof Error ? err.message : "Webhook error" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session: any = event.data.object;
    await prisma.payment.updateMany({
      where: { stripeSessionId: session.id },
      data: { status: "paid" }
    });
    await grantSongPurchase(session);
    if (session.metadata?.requestId) {
      await prisma.request.updateMany({
        where: { stripeSessionId: session.id },
        data: { paymentStatus: "paid" }
      });
    }
  }

  return NextResponse.json({ received: true });
}
