import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getOrCreateListener } from "@/lib/listener";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDownloadName(title: string) {
  return `${title.replace(/[^a-zA-Z0-9 _.-]/g, "").trim() || "George-Grissom-Song"}.mp3`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const songId = searchParams.get("songId");
  if (!songId) return NextResponse.json({ error: "Missing songId" }, { status: 400 });

  const listener = await getOrCreateListener();
  const entitlement = await prisma.songEntitlement.findUnique({
    where: { listenerId_songId: { listenerId: listener.id, songId } },
    include: { song: true }
  });
  if (!entitlement || entitlement.status !== "paid") {
    return NextResponse.json({ error: "Purchase required" }, { status: 403 });
  }
  if (!entitlement.song.privateAudioPath) return NextResponse.json({ error: "Download unavailable" }, { status: 404 });

  const result = await get(entitlement.song.privateAudioPath, { access: "private" });
  if (!result || result.statusCode !== 200) return new NextResponse("Audio not found", { status: 404 });

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "audio/mpeg",
      "Content-Disposition": `attachment; filename="${safeDownloadName(entitlement.song.title)}"`,
      "Content-Length": String(result.blob.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
