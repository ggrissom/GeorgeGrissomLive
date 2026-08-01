import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { toPublicJukeboxSong } from "@/lib/jukebox";
import { lyricSearchLinks } from "@/lib/metadata";
import { deleteOwnedJukeboxAudio } from "@/app/api/admin/songs/audio/storage";
import {
  SongPatchValidationError,
  assertSongPatchHasChanges,
  validateSongPatchId,
} from "@/lib/song-patch-validation";

class SongInputValidationError extends Error {}

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
  const jukebox = searchParams.get("jukebox") === "1";
  const where = jukebox ? { isPublic: true } : admin ? undefined : unlock ? { paidCatalog: true } : { publicShortlist: true };
  const songs = await prisma.song.findMany({
    where,
    orderBy: jukebox ? [{ jukeboxOrder: "asc" }, { title: "asc" }] : [{ title: "asc" }],
    include: admin
      ? {
          setlists: {
            include: { setlist: true },
            orderBy: { createdAt: "desc" }
          }
        }
      : undefined
  });

  return NextResponse.json(
    songs.map(song => jukebox ? toPublicJukeboxSong(song) : songPublicShape(song, Boolean(admin))),
  );
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const input = validateSongInput(() => normalizeSongInput(body));
  if (input instanceof NextResponse) return input;
  const song = await prisma.song.create({
    data: input
  });
  await attachSongToSetlists(song.id, body);
  const saved = await prisma.song.findUnique({
    where: { id: song.id },
    include: { setlists: { include: { setlist: true } } }
  });
  return NextResponse.json(saved || song);
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const input = validateSongInput(() => normalizeSongInput(body, true));
  if (input instanceof NextResponse) return input;
  const patch = validateSongInput(() => {
    const id = validateSongPatchId(body.id);
    assertSongPatchHasChanges(input);
    return { id, data: input };
  });
  if (patch instanceof NextResponse) return patch;
  const song = await prisma.song.update({
    where: { id: patch.id },
    data: patch.data
  });
  await attachSongToSetlists(song.id, body);
  const saved = await prisma.song.findUnique({
    where: { id: song.id },
    include: { setlists: { include: { setlist: true } } }
  });
  return NextResponse.json(saved || song);
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const song = await prisma.song.findUnique({
    where: { id },
    select: { audioUrl: true }
  });
  if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });
  await prisma.song.delete({ where: { id } });
  let audioDeleted = false;
  if (searchParams.get("deleteAudio") === "1") {
    audioDeleted = await deleteOwnedJukeboxAudio(song.audioUrl).catch(() => {
      console.error("Unable to remove deleted song audio object");
      return false;
    });
  }
  return NextResponse.json({ ok: true, audioDeleted });
}

function validateSongInput<T>(normalizer: () => T): T | NextResponse {
  try {
    return normalizer();
  } catch (error) {
    if (error instanceof SongInputValidationError || error instanceof SongPatchValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

function normalizeSongInput(body: any, patch = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new SongInputValidationError("Song data must be an object");
  }

  const data: any = {};
  const fields = [
    "title", "artist", "composer", "genre", "mood", "tempoLabel", "bpm", "songKey", "lyricsText", "chordsText",
    "audioUrl", "album", "durationSeconds", "jukeboxOrder",
    "privateRehearsalNotes", "privateLyricsNotes", "privateChordNotes", "rightsStatus",
    "publicLyricsAllowed", "publicChordsAllowed", "requestable", "publicShortlist", "paidCatalog", "isPublic",
    "minTipCents", "freePlayLimit", "confidenceScore", "sourceLinks"
  ];

  for (const field of fields) {
    if (!patch || Object.prototype.hasOwnProperty.call(body, field)) data[field] = body[field];
  }

  if (!patch && !data.title) data.title = "Untitled Song";
  if (data.bpm !== undefined && data.bpm !== null && data.bpm !== "") data.bpm = Number(data.bpm);
  if (data.minTipCents !== undefined && data.minTipCents !== null && data.minTipCents !== "") data.minTipCents = Number(data.minTipCents);
  if (data.freePlayLimit !== undefined && data.freePlayLimit !== null && data.freePlayLimit !== "") data.freePlayLimit = Number(data.freePlayLimit);
  if (data.album !== undefined) data.album = normalizeOptionalText(data.album);
  if (data.durationSeconds !== undefined) data.durationSeconds = normalizeNonNegativeInteger(data.durationSeconds, "durationSeconds", null);
  if (data.jukeboxOrder !== undefined) data.jukeboxOrder = normalizeNonNegativeInteger(data.jukeboxOrder, "jukeboxOrder", 0);

  return data;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === null || value === "") return null;
  return String(value).trim() || null;
}

function normalizeNonNegativeInteger(value: unknown, field: string, emptyValue: number | null): number | null {
  if (value === null || value === "") return emptyValue;

  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new SongInputValidationError(`${field} must be a non-negative integer`);
  }

  return numberValue;
}

function requestedSetlistNames(body: any) {
  const fromText = String(body.setlistNames || "")
    .split(",")
    .map(name => name.trim())
    .filter(Boolean);
  const fromArray = Array.isArray(body.setlistNameList) ? body.setlistNameList.map((name: any) => String(name).trim()).filter(Boolean) : [];
  return Array.from(new Set([...fromText, ...fromArray]));
}

async function nextPosition(setlistId: string) {
  const last = await prisma.setlistSong.findFirst({
    where: { setlistId },
    orderBy: { position: "desc" }
  });
  return (last?.position ?? -1) + 1;
}

async function attachSongToSetlists(songId: string, body: any) {
  const setlistIds = Array.isArray(body.setlistIds) ? body.setlistIds.filter(Boolean) : [];
  const names = requestedSetlistNames(body);

  for (const setlistId of setlistIds) {
    const existing = await prisma.setlistSong.findUnique({ where: { setlistId_songId: { setlistId, songId } } });
    if (!existing) {
      await prisma.setlistSong.create({ data: { setlistId, songId, position: await nextPosition(setlistId) } });
    }
  }

  for (const name of names) {
    let setlist = await prisma.setlist.findFirst({ where: { name } });
    if (!setlist) {
      setlist = await prisma.setlist.create({
        data: {
          name,
          venueName: body.defaultSetlistVenue || "Venue TBA",
          isPrivate: true,
          notes: "Created from the song editor. Update venue/event from the Setlists tab."
        }
      });
    }
    const existing = await prisma.setlistSong.findUnique({ where: { setlistId_songId: { setlistId: setlist.id, songId } } });
    if (!existing) {
      await prisma.setlistSong.create({ data: { setlistId: setlist.id, songId, position: await nextPosition(setlist.id) } });
    }
  }
}
