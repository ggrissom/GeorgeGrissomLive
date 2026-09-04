import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureVisitorId, getVisitorId, setVisitorCookie } from "@/lib/jukebox-access";
import { audioAssetForSlug } from "@/lib/audio-catalog";

function stripePriceFromSourceLinks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const priceId = (value as Record<string, unknown>).stripePriceId;
  return typeof priceId === "string" && priceId.startsWith("price_") ? priceId : null;
}

export async function POST(request: Request) {
  const body = await request.json();
  const type = String(body.type || "tip");
  const existingVisitorId = await getVisitorId();
  const visitorId = ensureVisitorId(existingVisitorId);

  let amountCents = Math.max(25, Number(body.amountCents || 25));
  let label = String(body.label || "George Grissom Live");
  let metadata: Record<string, string> = { type, visitorId };
  let stripePriceId: string | null = null;

  if (type === "song_download") {
    const songId = String(body.songId || "");
    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });
    const asset = audioAssetForSlug(song.slug);
    if (!asset) return NextResponse.json({ error: "Song is not in the active MP3 catalog" }, { status: 404 });
    amountCents = song.downloadPriceCents || 200;
    label = `${song.title} — MP3 download`;
    stripePriceId = stripePriceFromSourceLinks(song.sourceLinks) || asset.stripePriceId || null;
    metadata = { type, visitorId, songId: song.id, songSlug: song.slug || "" };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    const payment = await prisma.payment.create({
      data: { type, amountCents, status: "demo_no_stripe", metadata }
    });
    const response = NextResponse.json({ demoMode: true, payment, message: "Stripe is not configured." });
    if (!existingVisitorId) setVisitorCookie(response, visitorId);
    return response;
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const lineItems = stripePriceId
    ? [{ price: stripePriceId, quantity: 1 }]
    : [{
        price_data: {
          currency: "usd",
          product_data: { name: label, metadata },
          unit_amount: amountCents
        },
        quantity: 1
      }];

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: type === "song_download"
      ? `${site}/purchase-complete?session_id={CHECKOUT_SESSION_ID}`
      : `${site}/?paid=1&type=${encodeURIComponent(type)}`,
    cancel_url: `${site}/?canceled=1`,
    metadata
  });

  await prisma.payment.create({
    data: { type, amountCents, status: "created", stripeSessionId: session.id, metadata }
  });

  const response = NextResponse.json({ checkoutUrl: session.url });
  if (!existingVisitorId) setVisitorCookie(response, visitorId);
  return response;
}
