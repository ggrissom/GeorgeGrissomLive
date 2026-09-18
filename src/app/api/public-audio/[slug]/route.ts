import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hostedTrackUrl, publicTrackForSlug } from "@/lib/public-track-catalog";
import { isGoogleDriveAudioConfigured, readAudioFile } from "@/lib/audio-storage";

export const runtime = "nodejs";

function sourceLinksObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function reachableAudioUrl(url: string) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(3500)
    });
    if (!response.ok) return false;
    const type = response.headers.get("content-type") || "";
    return type.startsWith("audio/") || type === "application/octet-stream";
  } catch {
    return false;
  }
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

  const hostedFileName =
    (typeof links.hostedFileName === "string" && links.hostedFileName) ||
    seeded?.hostedFileName ||
    null;

  const candidateUrl =
    (song.audioUrl && /^https?:\/\//i.test(song.audioUrl) ? song.audioUrl : null) ||
    hostedTrackUrl(hostedFileName);

  if (candidateUrl && await reachableAudioUrl(candidateUrl)) {
    return Response.redirect(candidateUrl, 307);
  }

  const driveFileId =
    (typeof links.fullMp3DriveFileId === "string" && links.fullMp3DriveFileId) ||
    (typeof links.driveFileId === "string" && links.driveFileId) ||
    seeded?.fileId ||
    null;

  try {
    if (driveFileId && !isGoogleDriveAudioConfigured()) {
      const direct = new URL("https://drive.usercontent.google.com/download");
      direct.searchParams.set("id", driveFileId);
      direct.searchParams.set("export", "download");
      direct.searchParams.set("confirm", "t");
      return Response.redirect(direct, 307);
    }

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
