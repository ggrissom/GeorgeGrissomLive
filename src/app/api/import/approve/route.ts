import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const rowIds: string[] = Array.isArray(body.rowIds) ? body.rowIds : [body.rowId].filter(Boolean);
  if (!rowIds.length) return NextResponse.json({ error: "No rows selected." }, { status: 400 });

  const created = [];
  for (const id of rowIds) {
    const row = await prisma.importRow.findUnique({ where: { id } });
    if (!row) continue;
    const proposed: any = row.proposed;
    const song = await prisma.song.create({
      data: {
        title: proposed.title || "Untitled Song",
        artist: proposed.artist || null,
        composer: proposed.composer || null,
        genre: proposed.genre || null,
        mood: proposed.mood || null,
        tempoLabel: proposed.tempoLabel || "unknown",
        bpm: proposed.bpm ? Number(proposed.bpm) : null,
        songKey: proposed.songKey || null,
        privateRehearsalNotes: proposed.privateRehearsalNotes || null,
        privateLyricsNotes: proposed.privateLyricsNotes || null,
        privateChordNotes: proposed.privateChordNotes || null,
        requestable: proposed.requestable !== false,
        publicShortlist: proposed.publicShortlist === true,
        paidCatalog: proposed.paidCatalog !== false,
        minTipCents: Number(proposed.minTipCents || 25),
        confidenceScore: Number(proposed.confidenceScore || 0.5),
        rightsStatus: "private_reference"
      }
    });
    await prisma.importRow.update({ where: { id }, data: { status: "approved" } });
    created.push(song);
  }

  return NextResponse.json({ created });
}
