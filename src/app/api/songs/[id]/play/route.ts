import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPlayToken, ensureVisitorId, getVisitorId, setVisitorCookie } from "@/lib/jukebox-access";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await prisma.song.findUnique({ where: { id } });
  if (!song || !song.isPublic || !song.slug) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  const existingVisitorId = await getVisitorId();
  const visitorId = ensureVisitorId(existingVisitorId);
  const purchase = await prisma.songPurchase.findUnique({
    where: { visitorId_songId: { visitorId, songId: song.id } }
  });

  let fullPlays = song.freePlayLimit;
  let mode: "full" | "preview" = "full";

  if (!purchase) {
    const play = await prisma.songPlay.upsert({
      where: { visitorId_songId: { visitorId, songId: song.id } },
      create: { visitorId, songId: song.id, fullPlays: 0 },
      update: {}
    });
    fullPlays = play.fullPlays;

    if (fullPlays >= song.freePlayLimit) {
      mode = "preview";
    } else {
      const updated = await prisma.songPlay.update({
        where: { visitorId_songId: { visitorId, songId: song.id } },
        data: { fullPlays: { increment: 1 } }
      });
      fullPlays = updated.fullPlays;
    }
  }

  const response = NextResponse.json({
    mode,
    purchased: Boolean(purchase),
    fullPlays,
    remainingFullPlays: purchase ? null : Math.max(0, song.freePlayLimit - fullPlays),
    audioUrl: mode === "preview"
      ? song.previewUrl
      : `/api/audio/${encodeURIComponent(song.slug)}?token=${encodeURIComponent(createPlayToken(visitorId, song.slug))}`,
    downloadUrl: purchase ? `/api/download/${encodeURIComponent(song.slug)}` : null,
    priceCents: song.downloadPriceCents
  });

  if (!existingVisitorId) setVisitorCookie(response, visitorId);
  return response;
}
