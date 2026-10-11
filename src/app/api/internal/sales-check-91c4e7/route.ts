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
      where: { type: "digital_product", status: "paid" },
      select: { amountCents: true, metadata: true, createdAt: true }
    }),
    prisma.songPurchase.findMany({
      select: { amountCents: true, createdAt: true, song: { select: { slug: true, title: true } } }
    })
  ]);

  const bySku: Record<string, { count: number; amountCents: number }> = {};
  for (const payment of payments) {
    const metadata = asObject(payment.metadata);
    const sku = typeof metadata.sku === "string" ? metadata.sku : "unknown";
    const row = bySku[sku] || { count: 0, amountCents: 0 };
    row.count += 1;
    row.amountCents += payment.amountCents;
    bySku[sku] = row;
  }

  const byTrack: Record<string, { title: string; count: number; amountCents: number }> = {};
  for (const purchase of purchases) {
    const slug = purchase.song.slug || "unknown";
    const row = byTrack[slug] || { title: purchase.song.title, count: 0, amountCents: 0 };
    row.count += 1;
    row.amountCents += purchase.amountCents;
    byTrack[slug] = row;
  }

  return NextResponse.json({
    paidDigitalPayments: payments.length,
    paidDigitalRevenueCents: payments.reduce((sum, p) => sum + p.amountCents, 0),
    songPurchases: purchases.length,
    songPurchaseRevenueCents: purchases.reduce((sum, p) => sum + p.amountCents, 0),
    bySku,
    byTrack,
    latestPaidDigitalPaymentAt: payments.map(p => p.createdAt).sort((a,b)=>b.getTime()-a.getTime())[0] || null,
    latestSongPurchaseAt: purchases.map(p => p.createdAt).sort((a,b)=>b.getTime()-a.getTime())[0] || null
  });
}
