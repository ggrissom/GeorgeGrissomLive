import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId } from "@/lib/jukebox-access";
import { audioAssetForSlug } from "@/lib/audio-catalog";
import { readAudioFile } from "@/lib/audio-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const visitorId = await getVisitorId();
  if (!visitorId) return NextResponse.json({ error: "Purchase required" }, { status: 401 });

  const song = await prisma.song.findUnique({ where: { slug } });
  const asset = audioAssetForSlug(slug);
  if (!song || !asset) return NextResponse.json({ error: "Song unavailable" }, { status: 404 });

  const purchase = await prisma.songPurchase.findUnique({
    where: { visitorId_songId: { visitorId, songId: song.id } }
  });
  if (!purchase) return NextResponse.json({ error: "Purchase required" }, { status: 403 });

  try {
    const file = await readAudioFile({
      driveFileId: asset.fullDriveFileId,
      localPath: asset.fullPath
    });

    return new Response(file.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(file.body.length),
        "Content-Disposition": `attachment; filename="${asset.slug}.mp3"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error("Purchased MP3 download failed", { slug, error });
    return NextResponse.json({ error: "Download temporarily unavailable" }, { status: 503 });
  }
}
