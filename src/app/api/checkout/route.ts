import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureVisitorId, getVisitorId, setVisitorCookie } from "@/lib/jukebox-access";
import { digitalProductForSku, purchasableTrackForSlug } from "@/lib/digital-products";

function digitalCheckoutResponse(
  product: NonNullable<ReturnType<typeof digitalProductForSku>>,
  visitorId: string,
  existingVisitorId: string | null
) {
  if (!product.stripePaymentLinkUrl) {
    return NextResponse.json({ error: "Digital checkout is not configured" }, { status: 503 });
  }

  const checkoutUrl = new URL(product.stripePaymentLinkUrl);
  checkoutUrl.searchParams.set("client_reference_id", visitorId);
  const response = NextResponse.json({ checkoutUrl: checkoutUrl.toString() });
  if (!existingVisitorId) setVisitorCookie(response, visitorId);
  return response;
}

export async function POST(request: Request) {
  const body = await request.json();
  const requestedType = String(body.type || "tip");
  const requestedSku = typeof body.sku === "string" ? body.sku : "";
  const existingVisitorId = await getVisitorId();
  const visitorId = ensureVisitorId(existingVisitorId);

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
    if (product.kind === "track") {
      const song = await prisma.song.findUnique({ where: { slug: product.trackSlug } });
      if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }
    return digitalCheckoutResponse(product, visitorId, existingVisitorId);
  }

  if (requestedType === "song_download") {
    const songId = String(body.songId || "");
    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song?.slug) return NextResponse.json({ error: "Song not found" }, { status: 404 });

    const product = purchasableTrackForSlug(song.slug);
    if (!product) {
      return NextResponse.json({ error: "This song is not available as a WAV download" }, { status: 409 });
    }
    return digitalCheckoutResponse(product, visitorId, existingVisitorId);
  }

  // Existing non-digital payment path (tips/requests) remains intact.
  const type = requestedType;
  const amountCents = Math.max(25, Number(body.amountCents || 25));
  const label = String(body.label || "George Grissom Live");
  const metadata: Record<string, string> = { type, visitorId };

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
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://georgegrissom.com";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: label, metadata },
        unit_amount: amountCents
      },
      quantity: 1
    }],
    success_url: `${site}/?paid=1&type=${encodeURIComponent(type)}`,
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
