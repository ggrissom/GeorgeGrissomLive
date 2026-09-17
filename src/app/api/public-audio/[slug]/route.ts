import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicTrackForSlug } from "@/lib/public-track-catalog";
import { readAudioFile } from "@/lib/audio-storage";

export const runtime = "nodejs";

function sourceLinksObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: key } = await params;

  const song = await prisma.song.findFirst({
    where: {
      isPublic: true,
      publicShortlist: true,
      OR: [
        { id: key },
        { slug: key }
      ]
    }
  });

  if (!song) return NextResponse.json({ error: "Track not found" }, { status: 404 });

  const links = sourceLinksObject(song.sourceLinks);
  const seeded = song.slug ? publicTrackForSlug(song.slug) : null;
  const driveFileId =
    (typeof links.fullMp3DriveFileId === "string" && links.fullMp3DriveFileId) ||
    (typeof links.driveFileId === "string" && links.driveFileId) ||
    seeded?.fileId ||
    null;

  try {
    if (driveFileId || song.audioPath) {
      const file = await readAudioFile(
        {
          driveFileId,
          localPath: song.audioPath
        },
        request.headers.get("range")
      );

      return new Response(file.body, {
        status: file.status,
        headers: {
          ...file.headers,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    if (song.audioUrl) {
      return Response.redirect(new URL(song.audioUrl, request.url), 307);
    }

    return NextResponse.json({ error: "Audio source not configured" }, { status: 404 });
  } catch (error) {
    console.error("Public audio stream failed", { key, songId: song.id, error });
    return NextResponse.json({ error: "Audio temporarily unavailable" }, { status: 503 });
  }
}
