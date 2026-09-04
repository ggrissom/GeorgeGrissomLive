import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import { AUDIO_CATALOG } from "../src/lib/audio-catalog";

const prisma = new PrismaClient();
const PRICE_CENTS = 200;

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log("Stripe song product sync skipped: STRIPE_SECRET_KEY is not configured.");
    return;
  }

  if (process.env.VERCEL && process.env.VERCEL_ENV !== "production") {
    console.log(`Stripe song product sync skipped in ${process.env.VERCEL_ENV || "non-production"} deployment.`);
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const products = await stripe.products.list({ active: true, limit: 100 });

  for (const track of AUDIO_CATALOG) {
    let product = products.data.find(item => item.metadata.song_slug === track.slug);
    if (!product) {
      product = await stripe.products.create({
        name: `${track.title} — MP3 Download`,
        description: "Full-length 320 kbps MP3 download by George Grissom.",
        metadata: {
          song_slug: track.slug,
          artist: "George Grissom",
          delivery_format: "mp3",
          catalog: "GeorgeGrissomLive"
        }
      });
      products.data.push(product);
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100
    });
    let price = prices.data.find(item =>
      item.currency === "usd" &&
      item.unit_amount === PRICE_CENTS &&
      item.type === "one_time"
    );

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: PRICE_CENTS,
        metadata: {
          song_slug: track.slug,
          delivery_format: "mp3"
        }
      });
    }

    if (product.default_price !== price.id) {
      product = await stripe.products.update(product.id, { default_price: price.id });
    }

    const song = await prisma.song.findUnique({ where: { slug: track.slug } });
    if (!song) throw new Error(`Song seed missing for ${track.slug}`);
    await prisma.song.update({
      where: { id: song.id },
      data: {
        downloadPriceCents: PRICE_CENTS,
        sourceLinks: {
          stripeProductId: product.id,
          stripePriceId: price.id,
          fullMp3DriveFileId: track.fullDriveFileId,
          previewMp3DriveFileId: track.previewDriveFileId
        }
      }
    });

    console.log(`Stripe product ready: ${track.title} (${product.id}, ${price.id})`);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
