import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CheckoutItem = {
  slug: string;
  title: string;
  src: string;
  priceCents: number;
};

function cleanItem(item: CheckoutItem): CheckoutItem | null {
  const slug = String(item.slug || "").replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const title = String(item.title || "").trim().slice(0, 120);
  const src = String(item.src || "").trim();
  const priceCents = Number(item.priceCents || 200);

  if (!slug || !title || !src.startsWith("/audio/")) return null;

  return {
    slug,
    title,
    src,
    priceCents: priceCents === 200 ? 200 : 200,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems.map(cleanItem).filter(Boolean) as CheckoutItem[];

  if (items.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is missing in Vercel environment variables." },
      { status: 500 }
    );
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.headers.get("origin") ||
    "https://georgegrissom.com";

  const purchasedSlugs = encodeURIComponent(items.map((item) => item.slug).join(","));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${item.title} — Song Download`,
          metadata: {
            songSlug: item.slug,
            audioPath: item.src,
          },
        },
        unit_amount: 200,
      },
      quantity: 1,
    })),
    success_url: `${origin}/cart/success?songs=${purchasedSlugs}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
    metadata: {
      type: "song_download_cart",
      songSlugs: items.map((item) => item.slug).join(","),
    },
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
