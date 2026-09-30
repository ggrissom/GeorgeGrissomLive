import { head, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { purchasableTrackForSlug } from "@/lib/digital-products";
import { streamPrivateDriveAudio } from "@/lib/audio-storage";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") || "";
  const product = purchasableTrackForSlug(slug);

  if (!product || !product.wavDriveFileId || !product.wavBlobPathname) {
    return NextResponse.json({ ok: false, error: "Unknown or unavailable track" });
  }

  try {
    const source = await streamPrivateDriveAudio(product.wavDriveFileId);
    if (!source.body) throw new Error("Drive returned no body.");

    await put(product.wavBlobPathname, source.body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "audio/wav",
      multipart: true
    });

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
    console.error("Paid WAV migration failed", { slug, error });
    return NextResponse.json({
      ok: false,
      slug,
      error: error instanceof Error ? error.message : "Migration failed"
    });
  }
}
