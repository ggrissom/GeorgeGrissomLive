import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET() {
  const [payments, purchases] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "paid" },
      select: { type: true, amountCents: true, metadata: true, createdAt: true, stripeSessionId: true }
    }),
    prisma.songPurchase.findMany({
      select: { amountCents: true, createdAt: true, stripeSessionId: true, song: { select: { slug: true, title: true } } }
    })
  ]);

  const digitalPayments = payments.filter(payment => {
    const metadata = asObject(payment.metadata);
    const sku = typeof metadata.sku === "string" ? metadata.sku : "";
    return payment.type === "song_download" || payment.type === "digital_product" || sku.startsWith("track:") || sku === "digital-album-preorder";
  });

  const byType: Record<string, { count: number; amountCents: number }> = {};
  const bySku: Record<string, { count: number; amountCents: number }> = {};
  for (const payment of digitalPayments) {
    const typeRow = byType[payment.type] || { count: 0, amountCents: 0 };
    typeRow.count += 1;
    typeRow.amountCents += payment.amountCents;
    byType[payment.type] = typeRow;

    const metadata = asObject(payment.metadata);
    const sku = typeof metadata.sku === "string" ? metadata.sku : "unknown";
    const skuRow = bySku[sku] || { count: 0, amountCents: 0 };
    skuRow.count += 1;
    skuRow.amountCents += payment.amountCents;
    bySku[sku] = skuRow;
  }

  const byTrack: Record<string, { title: string; count: number; amountCents: number }> = {};
  for (const purchase of purchases) {
    const slug = purchase.song.slug || "unknown";
    const row = byTrack[slug] || { title: purchase.song.title, count: 0, amountCents: 0 };
    row.count += 1;
    row.amountCents += purchase.amountCents;
    byTrack[slug] = row;
  }

  const paymentSessionIds = new Set(digitalPayments.map(p => p.stripeSessionId).filter(Boolean));
  const matchedPurchases = purchases.filter(p => paymentSessionIds.has(p.stripeSessionId));

  return NextResponse.json({
    paidDigitalSales: digitalPayments.length,
    paidDigitalRevenueCents: digitalPayments.reduce((sum, p) => sum + p.amountCents, 0),
    byType,
    bySku,
    songPurchases: purchases.length,
    matchedSongPurchasesToPaidPayments: matchedPurchases.length,
    byTrack,
    latestPaidDigitalSaleAt: digitalPayments.map(p => p.createdAt).sort((a,b)=>b.getTime()-a.getTime())[0] || null
  });
}
