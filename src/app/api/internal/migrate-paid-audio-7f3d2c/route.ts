import { head, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { purchasableTrackForSlug } from "@/lib/digital-products";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") || "";
  const sourceUrl = url.searchParams.get("src") || "";
  const product = purchasableTrackForSlug(slug);

  if (!product || !product.wavBlobPathname) {
    return NextResponse.json({ ok: false, slug, error: "Unknown track" });
  }

  try {
    if (sourceUrl) {
      const source = await fetch(sourceUrl, { cache: "no-store", redirect: "follow" });
      if (!source.ok || !source.body) throw new Error(`Source fetch failed (${source.status})`);

      await put(product.wavBlobPathname, source.body, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "audio/wav",
        multipart: true
      });
    }

    const meta = await head(product.wavBlobPathname);
    return NextResponse.json({
      ok: true,
      slug,
      pathname: meta.pathname,
      size: meta.size,
      contentType: meta.contentType,
      uploadedAt: meta.uploadedAt
    });
  } catch (error) {
    console.error("Paid WAV migration/verification failed", { slug, error });
    return NextResponse.json({
      ok: false,
      slug,
      error: error instanceof Error ? error.message : "Migration/verification failed"
    });
  }
}
