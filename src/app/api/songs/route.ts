import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { lyricSearchLinks } from "@/lib/metadata";

function songPublicShape(song: any, admin: boolean) {
  if (admin) return { ...song, lyricSearchLinks: lyricSearchLinks(song.title, song.artist) };
  return {
    id: song.id,
    slug: song.slug,
    title: song.title,
    artist: song.artist,
    album: song.album,
    durationSeconds: song.durationSeconds,
    genre: song.genre,
    mood: song.mood,
    tempoLabel: song.tempoLabel,
    previewUrl: song.previewUrl,
    downloadPriceCents: song.downloadPriceCents,
    requestable: song.requestable,
    publicShortlist: song.publicShortlist,
    paidCatalog: song.paidCatalog,
    minTipCents: song.minTipCents,
    freePlayLimit: song.freePlayLimit
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get("admin") === "1" && await isAdminRequest();
  const unlock = searchParams.get("unlock") === "1";
  const where = admin ? undefined : unlock ? { paidCatalog: true } : { publicShortlist: true };
  const songs = await prisma.song.findMany({
    where,
    orderBy: [{ title: "asc" }],
    include: admin
      ? {
          setlists: {
            include: { setlist: true },
            orderBy: { createdAt: "desc" }
          }
        }
      : undefined
  });
  return NextResponse.json(songs.map(song => songPublicShape(song, Boolean(admin))));
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const song = await prisma.song.create({ data: normalizeSongInput(body) });
  await attachSongToSetlists(song.id, body);
  const saved = await prisma.song.findUnique({ where: { id: song.id }, include: { setlists: { include: { setlist: true } } } });
  return NextResponse.json(saved || song);
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const song = await prisma.song.update({ where: { id: body.id }, data: normalizeSongInput(body, true) });
  await attachSongToSetlists(song.id, body);
  const saved = await prisma.song.findUnique({ where: { id: song.id }, include: { setlists: { include: { setlist: true } } } });
  return NextResponse.json(saved || song);
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.song.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

function normalizeSongInput(body: any, patch = false) {
  const data: any = {};
  const fields = [
    "slug", "title", "artist", "album", "composer", "genre", "mood", "tempoLabel", "bpm", "songKey", "keySignature",
    "durationSeconds", "audioUrl", "previewUrl", "audioPath", "downloadPriceCents", "lyricsText", "chordsText",
    "privateRehearsalNotes", "privateLyricsNotes", "privateChordNotes", "rightsStatus",
    "publicLyricsAllowed", "publicChordsAllowed", "requestable", "publicShortlist", "paidCatalog",
    "minTipCents", "freePlayLimit", "confidenceScore", "sourceLinks", "isPublic"
  ];

  for (const field of fields) {
    if (!patch || Object.prototype.hasOwnProperty.call(body, field)) data[field] = body[field];
  }

  if (!patch && !data.title) data.title = "Untitled Song";
  for (const field of ["bpm", "durationSeconds", "confidenceScore"]) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== "") data[field] = Number(data[field]);
  }
  for (const field of ["downloadPriceCents", "minTipCents", "freePlayLimit"]) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== "") data[field] = Number(data[field]);
  }

  return data;
}

function requestedSetlistNames(body: any) {
  const fromText = String(body.setlistNames || "").split(",").map(name => name.trim()).filter(Boolean);
  const fromArray = Array.isArray(body.setlistNameList) ? body.setlistNameList.map((name: any) => String(name).trim()).filter(Boolean) : [];
  return Array.from(new Set([...fromText, ...fromArray]));
}

async function nextPosition(setlistId: string) {
  const last = await prisma.setlistSong.findFirst({ where: { setlistId }, orderBy: { position: "desc" } });
  return (last?.position ?? -1) + 1;
}

async function attachSongToSetlists(songId: string, body: any) {
  const setlistIds = Array.isArray(body.setlistIds) ? body.setlistIds.filter(Boolean) : [];
  const names = requestedSetlistNames(body);

  for (const setlistId of setlistIds) {
    const existing = await prisma.setlistSong.findUnique({ where: { setlistId_songId: { setlistId, songId } } });
    if (!existing) await prisma.setlistSong.create({ data: { setlistId, songId, position: await nextPosition(setlistId) } });
  }

  for (const name of names) {
    let setlist = await prisma.setlist.findFirst({ where: { name } });
    if (!setlist) {
      setlist = await prisma.setlist.create({
        data: { name, venueName: body.defaultSetlistVenue || "Venue TBA", isPrivate: true, notes: "Created from the song editor. Update venue/event from the Setlists tab." }
      });
    }
    const existing = await prisma.setlistSong.findUnique({ where: { setlistId_songId: { setlistId: setlist.id, songId } } });
    if (!existing) await prisma.setlistSong.create({ data: { setlistId: setlist.id, songId, position: await nextPosition(setlist.id) } });
  }
}
