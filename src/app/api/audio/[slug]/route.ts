import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId, verifyPlayToken } from "@/lib/jukebox-access";
import { audioAssetForSlug } from "@/lib/audio-catalog";
import { readAudioFile } from "@/lib/audio-storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const visitorId = await getVisitorId();
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!visitorId || !verifyPlayToken(token, visitorId, slug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const song = await prisma.song.findUnique({ where: { slug } });
  const asset = audioAssetForSlug(slug);
  if (!song || !asset) return NextResponse.json({ error: "Audio unavailable" }, { status: 404 });

  try {
    const file = await readAudioFile(
      {
        driveFileId: asset.fullDriveFileId,
        localPath: asset.fullPath
      },
      request.headers.get("range")
    );

    return new Response(file.body, {
      status: file.status,
      headers: {
        ...file.headers,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error("Full audio stream failed", { slug, error });
    return NextResponse.json({ error: "Audio temporarily unavailable" }, { status: 503 });
  }
}
