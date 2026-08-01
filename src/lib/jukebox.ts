export type PublicJukeboxSong = {
  id: string;
  title: string;
  artist: string;
  albumLabel: string;
  audioUrl: string | null;
  durationSeconds: number | null;
  jukeboxOrder: number;
  playable: boolean;
};

type JukeboxSongInput = {
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  jukeboxOrder?: number | null;
};

function trimmedValue(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed || null;
}

export function toPublicJukeboxSong(song: JukeboxSongInput): PublicJukeboxSong {
  const audioUrl = trimmedValue(song.audioUrl);

  return {
    id: song.id,
    title: trimmedValue(song.title) ?? "",
    artist: trimmedValue(song.artist) ?? "Unknown Artist",
    albumLabel: trimmedValue(song.album) ?? "SINGLE",
    audioUrl,
    durationSeconds:
      typeof song.durationSeconds === "number" && Number.isFinite(song.durationSeconds)
        ? song.durationSeconds
        : null,
    jukeboxOrder:
      typeof song.jukeboxOrder === "number" && Number.isFinite(song.jukeboxOrder)
        ? song.jukeboxOrder
        : 0,
    playable: audioUrl !== null,
  };
}

export function paginateSongs<T>(songs: T[], pageSize = 5): T[][] {
  if (pageSize < 1) throw new RangeError("pageSize must be positive");

  const pages: T[][] = [];
  for (let index = 0; index < songs.length; index += pageSize) {
    pages.push(songs.slice(index, index + pageSize));
  }

  return pages;
}

export function createSpreads<T>(pages: T[][]): Array<{ left: T[]; right?: T[] }> {
  const spreads: Array<{ left: T[]; right?: T[] }> = [];
  for (let index = 0; index < pages.length; index += 2) {
    spreads.push({ left: pages[index], right: pages[index + 1] });
  }

  return spreads;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "—";

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;

  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}
