import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateListener } from "@/lib/listener";

export async function POST(request: Request) {
  const body = await request.json();
  const type = String(body.type || "tip");
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  let amountCents = Math.max(25, Number(body.amountCents || 25));
  let label = String(body.label || "George Grissom Live");
  let songId: string | null = null;
  let listenerId: string | null = null;
  let songTitle: string | null = null;

  if (type === "song_download") {
    songId = String(body.songId || "");
    if (!songId) return NextResponse.json({ error: "Missing songId" }, { status: 400 });

    const [song, listener] = await Promise.all([
      prisma.song.findUnique({ where: { id: songId } }),
      getOrCreateListener()
    ]);
    if (!song || !song.isPublic || !song.paidCatalog) {
      return NextResponse.json({ error: "Song is not available for purchase" }, { status: 404 });
    }

    amountCents = song.downloadPriceCents || 200;
    label = `${song.title} — MP3 download`;
    songTitle = song.title;
    listenerId = listener.id;

    const existing = await prisma.songEntitlement.findUnique({
      where: { listenerId_songId: { listenerId, songId } }
    });
    if (existing?.status === "paid") {
      return NextResponse.json({
        alreadyPurchased: true,
        downloadUrl: `/api/audio/download?songId=${encodeURIComponent(songId)}`
      });
    }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const metadata: Record<string, string> = {
    type,
    ...(songId ? { songId } : {}),
    ...(listenerId ? { listenerId } : {})
  };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_creation: type === "song_download" ? "always" : undefined,
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: label,
          description: type === "song_download" ? "Digital MP3 download from George Grissom Live" : undefined,
          metadata: songId ? { songId } : undefined
        },
        unit_amount: amountCents
      },
      quantity: 1
    }],
    success_url: type === "song_download"
      ? `${site}/?purchase=success&song=${encodeURIComponent(songId || "")}&session_id={CHECKOUT_SESSION_ID}`
      : `${site}/?paid=1&type=${encodeURIComponent(type)}`,
    cancel_url: `${site}/?purchase=canceled`,
    metadata
  });

  await prisma.payment.create({
    data: {
      type,
      amountCents,
      status: "created",
      stripeSessionId: session.id,
      songId,
      listenerId,
      metadata: {
        ...body.metadata,
        ...(songTitle ? { songTitle } : {})
      }
    }
  });

  return NextResponse.json({ checkoutUrl: session.url, amountCents });
}
