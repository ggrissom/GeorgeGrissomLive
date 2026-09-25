import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId } from "@/lib/jukebox-access";
import { streamPrivateDriveAudio } from "@/lib/audio-storage";
import { purchasableTrackForSlug } from "@/lib/digital-products";
import { wavDownloadHeaders } from "@/lib/wav-download-policy";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
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
    const upstream = await streamPrivateDriveAudio(
      product.wavDriveFileId,
      request.headers.get("range")
    );

    const sourceHeaders = Object.fromEntries(upstream.headers.entries());
    return new Response(upstream.body, {
      status: upstream.status === 206 ? 206 : 200,
      headers: wavDownloadHeaders(product.wavFileName, sourceHeaders)
    });
  } catch (error) {
    console.error("Purchased WAV download failed", { slug, error });
    return NextResponse.json({ error: "Download temporarily unavailable" }, { status: 503 });
  }
}
