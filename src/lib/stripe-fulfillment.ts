import { prisma } from "@/lib/db";
import { digitalProductForSku } from "@/lib/digital-products";
import { isPaidCheckoutSession } from "@/lib/stripe-fulfillment-policy";

type CheckoutSessionLike = {
  id: string;
  payment_status?: string | null;
  amount_total?: number | null;
  client_reference_id?: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
};

export async function fulfillCheckoutSession(session: CheckoutSessionLike) {
  if (!isPaidCheckoutSession(session)) {
    return { fulfilled: false, reason: "payment_not_paid" as const };
  }

  const metadata = session.metadata || {};
  const visitorId = metadata.visitorId || session.client_reference_id || "";
  const storedMetadata = { ...metadata, ...(visitorId ? { visitorId } : {}) };

  const updated = await prisma.payment.updateMany({
    where: { stripeSessionId: session.id },
    data: { status: "paid", metadata: storedMetadata }
  });

  if (updated.count === 0) {
    await prisma.payment.create({
      data: {
        type: metadata.type || "stripe_payment",
        amountCents: Number(session.amount_total || 0),
        stripeSessionId: session.id,
        status: "paid",
        metadata: storedMetadata
      }
    });
  }

  if (metadata.type === "song_download") {
    if (!visitorId) {
      return { fulfilled: false, reason: "missing_visitor_reference" as const };
    }

    const product = digitalProductForSku(metadata.sku);
    const songSlug = metadata.songSlug || product?.trackSlug || "";
    const song = metadata.songId
      ? await prisma.song.findUnique({ where: { id: metadata.songId } })
      : songSlug
        ? await prisma.song.findUnique({ where: { slug: songSlug } })
        : null;

    if (!song) {
      return { fulfilled: false, reason: "missing_song_metadata" as const };
    }

    await prisma.songPurchase.upsert({
      where: { visitorId_songId: { visitorId, songId: song.id } },
      update: {
        stripeSessionId: session.id,
        amountCents: Number(session.amount_total || product?.priceCents || 200),
        customerEmail: session.customer_details?.email || null
      },
      create: {
        visitorId,
        songId: song.id,
        stripeSessionId: session.id,
        amountCents: Number(session.amount_total || product?.priceCents || 200),
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
