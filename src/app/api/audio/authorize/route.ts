import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateListener } from "@/lib/listener";
import { createMediaToken } from "@/lib/media-token";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const songId = String(body.songId || "");
  if (!songId) return NextResponse.json({ error: "Missing songId" }, { status: 400 });

  const [listener, song] = await Promise.all([
    getOrCreateListener(),
    prisma.song.findUnique({ where: { id: songId } })
  ]);
  if (!song || !song.isPublic) return NextResponse.json({ error: "Song not found" }, { status: 404 });

  const entitlement = await prisma.songEntitlement.findUnique({
    where: { listenerId_songId: { listenerId: listener.id, songId: song.id } }
  });

  if (entitlement?.status === "paid" && song.privateAudioPath) {
    const token = createMediaToken(song.id, "stream", 60 * 15);
    return NextResponse.json({
      mode: "full",
      purchased: true,
      streamUrl: `/api/audio/stream?token=${encodeURIComponent(token)}`,
      downloadUrl: `/api/audio/download?songId=${encodeURIComponent(song.id)}`,
      playsUsed: 0,
      playsRemaining: null,
      priceCents: song.downloadPriceCents
    });
  }

  let playback = await prisma.songPlayback.findUnique({
    where: { listenerId_songId: { listenerId: listener.id, songId: song.id } }
  });
  if (!playback) {
    playback = await prisma.songPlayback.create({
      data: { listenerId: listener.id, songId: song.id, fullPlays: 0 }
    });
  }

  if (song.privateAudioPath && playback.fullPlays < song.freePlayLimit) {
    playback = await prisma.songPlayback.update({
      where: { id: playback.id },
      data: { fullPlays: { increment: 1 } }
    });
    const token = createMediaToken(song.id, "stream", 60 * 15);
    return NextResponse.json({
      mode: "full",
      purchased: false,
      streamUrl: `/api/audio/stream?token=${encodeURIComponent(token)}`,
      downloadUrl: null,
      playsUsed: playback.fullPlays,
      playsRemaining: Math.max(0, song.freePlayLimit - playback.fullPlays),
      priceCents: song.downloadPriceCents
    });
  }

  return NextResponse.json({
    mode: "preview",
    purchased: false,
    streamUrl: song.previewUrl,
    previewSeconds: song.previewSeconds,
    downloadUrl: null,
    playsUsed: playback.fullPlays,
    playsRemaining: 0,
    priceCents: song.downloadPriceCents
  });
}
