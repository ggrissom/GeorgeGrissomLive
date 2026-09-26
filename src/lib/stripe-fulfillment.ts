import { prisma } from "@/lib/db";
import { isPaidCheckoutSession } from "@/lib/stripe-fulfillment-policy";

type CheckoutSessionLike = {
  id: string;
  payment_status?: string | null;
  amount_total?: number | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
};

export async function fulfillCheckoutSession(session: CheckoutSessionLike) {
  if (!isPaidCheckoutSession(session)) {
    return { fulfilled: false, reason: "payment_not_paid" as const };
  }

  await prisma.payment.updateMany({
    where: { stripeSessionId: session.id },
    data: { status: "paid" }
  });

  const metadata = session.metadata || {};

  if (metadata.type === "song_download") {
    const visitorId = metadata.visitorId;
    const songId = metadata.songId;
    if (!visitorId || !songId) {
      return { fulfilled: false, reason: "missing_song_metadata" as const };
    }

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

  if (metadata.requestId) {
    await prisma.request.updateMany({
      where: { stripeSessionId: session.id },
      data: { paymentStatus: "paid" }
    });
  }

  return { fulfilled: true as const };
}
