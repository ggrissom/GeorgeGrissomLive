import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureVisitorId, getVisitorId, setVisitorCookie } from "@/lib/jukebox-access";
import { buildDigitalCheckoutSpec } from "@/lib/digital-checkout";
import { digitalProductForSku, purchasableTrackForSlug } from "@/lib/digital-products";

export async function POST(request: Request) {
  const body = await request.json();
  const requestedType = String(body.type || "tip");
  const requestedSku = typeof body.sku === "string" ? body.sku : "";
  const existingVisitorId = await getVisitorId();
  const visitorId = ensureVisitorId(existingVisitorId);

  let type = requestedType;
  let amountCents = Math.max(25, Number(body.amountCents || 25));
  let label = String(body.label || "George Grissom Live");
  let metadata: Record<string, string> = { type, visitorId };
  let lineItems: any[] | null = null;
  let digitalCheckout = false;

  if (requestedSku) {
    const product = digitalProductForSku(requestedSku);
    if (!product) {
      return NextResponse.json({ error: "Digital product not found" }, { status: 404 });
    }
    if (!product.enabled) {
      return NextResponse.json(
        { error: product.disabledReason || "Digital product is not available yet" },
        { status: 409 }
      );
    }

    let songId: string | null = null;
    if (product.kind === "track") {
      const song = await prisma.song.findUnique({ where: { slug: product.trackSlug } });
      if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });
      songId = song.id;
    }

    const spec = buildDigitalCheckoutSpec(product.sku, visitorId, songId);
    if (!spec) {
      return NextResponse.json({ error: "Digital product is not ready for checkout" }, { status: 409 });
    }

    digitalCheckout = true;
    type = spec.paymentType;
    amountCents = spec.amountCents;
    label = product.kind === "track" ? `${product.title} — WAV download` : product.title;
    metadata = spec.metadata;
    lineItems = spec.lineItems;
  } else if (requestedType === "song_download") {
    // Backward-compatible path for any older client that still sends songId.
    // The client-provided amount is ignored; the server resolves the canonical SKU and Stripe Price.
    const songId = String(body.songId || "");
    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song?.slug) return NextResponse.json({ error: "Song not found" }, { status: 404 });

    const product = purchasableTrackForSlug(song.slug);
    if (!product) {
      return NextResponse.json({ error: "This song is not available as a WAV download" }, { status: 409 });
    }

    const spec = buildDigitalCheckoutSpec(product.sku, visitorId, song.id);
    if (!spec) {
      return NextResponse.json({ error: "Digital product is not ready for checkout" }, { status: 409 });
    }

    digitalCheckout = true;
    type = spec.paymentType;
    amountCents = spec.amountCents;
    label = `${product.title} — WAV download`;
    metadata = spec.metadata;
    lineItems = spec.lineItems;
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

  if (!lineItems) {
    lineItems = [{
      price_data: {
        currency: "usd",
        product_data: { name: label, metadata },
        unit_amount: amountCents
      },
      quantity: 1
    }];
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: digitalCheckout
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
