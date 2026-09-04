import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId } from "@/lib/jukebox-access";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const visitorId = await getVisitorId();
  if (!visitorId) return NextResponse.json({ error: "Purchase required" }, { status: 401 });

  const song = await prisma.song.findUnique({ where: { slug } });
  if (!song?.downloadPath) return NextResponse.json({ error: "WAV master unavailable" }, { status: 404 });

  const purchase = await prisma.songPurchase.findUnique({
    where: { visitorId_songId: { visitorId, songId: song.id } }
  });
  if (!purchase) return NextResponse.json({ error: "Purchase required" }, { status: 403 });

  const file = await readFile(path.join(process.cwd(), song.downloadPath));
  return new Response(file, {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(file.length),
      "Content-Disposition": `attachment; filename="${song.slug}.wav"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
