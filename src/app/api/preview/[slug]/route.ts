import { NextResponse } from "next/server";
import { audioAssetForSlug } from "@/lib/audio-catalog";
import { readAudioFile } from "@/lib/audio-storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const asset = audioAssetForSlug(slug);
  if (!asset) return NextResponse.json({ error: "Preview unavailable" }, { status: 404 });

  try {
    const file = await readAudioFile(
      {
        driveFileId: asset.previewDriveFileId,
        localPath: asset.previewPath
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
  } catch (error) {
    console.error("Preview audio failed", { slug, error });
    return NextResponse.json({ error: "Preview temporarily unavailable" }, { status: 503 });
  }
}
