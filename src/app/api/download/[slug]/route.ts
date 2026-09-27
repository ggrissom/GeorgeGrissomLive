import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId } from "@/lib/jukebox-access";
import { purchasableTrackForSlug } from "@/lib/digital-products";
import { wavDownloadHeaders } from "@/lib/wav-download-policy";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const visitorId = await getVisitorId();
  if (!visitorId) return NextResponse.json({ error: "Purchase required" }, { status: 401 });

  const song = await prisma.song.findUnique({ where: { slug } });
  const product = purchasableTrackForSlug(slug);
  if (!song || !product) return NextResponse.json({ error: "Song unavailable" }, { status: 404 });

  const purchase = await prisma.songPurchase.findUnique({
    where: { visitorId_songId: { visitorId, songId: song.id } }
  });
  if (!purchase) return NextResponse.json({ error: "Purchase required" }, { status: 403 });

  try {
    if (!product.wavBlobPathname) {
      return NextResponse.json({ error: "Download temporarily unavailable" }, { status: 503 });
    }

    const result = await get(product.wavBlobPathname, {
      access: "private",
      useCache: false
    });

    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: "Download temporarily unavailable" }, { status: 503 });
    }

    return new Response(result.stream, {
      status: 200,
      headers: wavDownloadHeaders(product.wavFileName, {
        "Content-Type": result.blob.contentType || "audio/wav"
      })
    });
  } catch (error) {
    console.error("Purchased WAV download failed", { slug, error });
    return NextResponse.json({ error: "Download temporarily unavailable" }, { status: 503 });
  }
}
