import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

  if (session.payment_status === "paid" && session.metadata?.type === "song_download") {
    const visitorId = session.metadata?.visitorId;
    const songId = session.metadata?.songId;
    if (visitorId && songId) {
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
      await prisma.payment.updateMany({ where: { stripeSessionId: session.id }, data: { status: "paid" } });
      return NextResponse.redirect(`${site}/?purchase=success&song=${encodeURIComponent(songId)}`);
    }
  }

  return NextResponse.redirect(`${site}/?purchase=error`);
}
