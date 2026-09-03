import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ skipped: true, reason: "Stripe not configured" }, { status: 503 });
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
    const session = event.data.object as any;
    await prisma.payment.updateMany({
      where: { stripeSessionId: session.id },
      data: { status: "paid" }
    });

    const songId = session.metadata?.songId;
    const listenerId = session.metadata?.listenerId;
    if (session.metadata?.type === "song_download" && songId && listenerId) {
      const song = await prisma.song.findUnique({ where: { id: songId } });
      if (song) {
        await prisma.songEntitlement.upsert({
          where: { listenerId_songId: { listenerId, songId } },
          create: {
            listenerId,
            songId,
            stripeSessionId: session.id,
            customerEmail: session.customer_details?.email || null,
            amountCents: session.amount_total || song.downloadPriceCents || 200,
            status: "paid"
          },
          update: {
            stripeSessionId: session.id,
            customerEmail: session.customer_details?.email || null,
            amountCents: session.amount_total || song.downloadPriceCents || 200,
            status: "paid"
          }
        });
      }
    }

    if (session.metadata?.requestId) {
      await prisma.request.updateMany({
        where: { stripeSessionId: session.id },
        data: { paymentStatus: "paid" }
      });
    }
  }

  return NextResponse.json({ received: true });
}
