import { NextResponse } from "next/server";
import { publicTrackForSlug } from "@/lib/public-track-catalog";
import { readAudioFile } from "@/lib/audio-storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = publicTrackForSlug(slug);
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

  try {
    const file = await readAudioFile(
      { driveFileId: track.fileId },
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
  } catch (error) {
    console.error("Public audio stream failed", { slug, error });
    return NextResponse.json({ error: "Audio temporarily unavailable" }, { status: 503 });
  }
}
