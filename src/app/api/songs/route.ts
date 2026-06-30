import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { lyricSearchLinks } from "@/lib/metadata";

function songPublicShape(song: any, admin: boolean) {
  if (admin) return { ...song, lyricSearchLinks: lyricSearchLinks(song.title, song.artist) };
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    genre: song.genre,
    mood: song.mood,
    tempoLabel: song.tempoLabel,
    audioUrl: song.audioUrl,
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
  const songs = await prisma.song.findMany({ where, orderBy: [{ title: "asc" }] });
  return NextResponse.json(songs.map(song => songPublicShape(song, Boolean(admin))));
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const song = await prisma.song.create({
    data: normalizeSongInput(body)
  });
  return NextResponse.json(song);
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const song = await prisma.song.update({
    where: { id: body.id },
    data: normalizeSongInput(body, true)
  });
  return NextResponse.json(song);
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
    "title", "artist", "composer", "genre", "mood", "tempoLabel", "bpm", "songKey", "lyricsText", "chordsText",
    "audioUrl", "privateRehearsalNotes", "privateLyricsNotes", "privateChordNotes", "rightsStatus",
    "publicLyricsAllowed", "publicChordsAllowed", "requestable", "publicShortlist", "paidCatalog",
    "minTipCents", "freePlayLimit", "confidenceScore", "sourceLinks"
  ];

  for (const field of fields) {
    if (!patch || Object.prototype.hasOwnProperty.call(body, field)) data[field] = body[field];
  }

  if (!patch && !data.title) data.title = "Untitled Song";
  if (data.bpm !== undefined && data.bpm !== null && data.bpm !== "") data.bpm = Number(data.bpm);
  if (data.minTipCents !== undefined && data.minTipCents !== null && data.minTipCents !== "") data.minTipCents = Number(data.minTipCents);
  if (data.freePlayLimit !== undefined && data.freePlayLimit !== null && data.freePlayLimit !== "") data.freePlayLimit = Number(data.freePlayLimit);

  return data;
}
