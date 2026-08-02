import {
  toPublicJukeboxSong,
  type PublicJukeboxSong,
} from "./jukebox";

export const SONG_PLAYS_STORAGE_KEY = "gg-song-plays";

export type HomepageJukeboxSong = PublicJukeboxSong & {
  genre: string | null;
  mood: string | null;
  tempoLabel: string | null;
  requestable: boolean;
  publicShortlist: boolean;
  paidCatalog: boolean;
  minTipCents: number;
  freePlayLimit: number;
};

export type PublicRequestSong = {
  id: string;
  title: string;
  artist: string | null;
};

type HomepageSongInput = Parameters<typeof toPublicJukeboxSong>[0] & {
  genre?: string | null;
  mood?: string | null;
  tempoLabel?: string | null;
  requestable?: boolean | null;
  publicShortlist?: boolean | null;
  paidCatalog?: boolean | null;
  minTipCents?: number | null;
  freePlayLimit?: number | null;
};

type SongPlayStorage = Pick<Storage, "getItem" | "setItem">;

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : fallback;
}

export function toHomepageJukeboxSong(
  song: HomepageSongInput,
): HomepageJukeboxSong {
  return {
    ...toPublicJukeboxSong(song),
    genre: optionalText(song.genre),
    mood: optionalText(song.mood),
    tempoLabel: optionalText(song.tempoLabel),
    requestable: song.requestable === true,
    publicShortlist: song.publicShortlist === true,
    paidCatalog: song.paidCatalog === true,
    minTipCents: nonNegativeInteger(song.minTipCents, 0),
    freePlayLimit: nonNegativeInteger(song.freePlayLimit, 2),
  };
}

export function toPublicRequestSong(song: {
  id: string;
  title: string;
  artist?: string | null;
}): PublicRequestSong {
  return {
    id: song.id,
    title: song.title,
    artist: optionalText(song.artist),
  };
}

export function readStoredSongPlays(
  storage: Pick<SongPlayStorage, "getItem">,
): Record<string, number> {
  try {
    const parsed = JSON.parse(storage.getItem(SONG_PLAYS_STORAGE_KEY) || "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([id, count]) =>
          Boolean(id) &&
          typeof count === "number" &&
          Number.isInteger(count) &&
          count >= 0,
      ),
    );
  } catch {
    return {};
  }
}

export function consumeStoredSongPlay(
  song: Pick<HomepageJukeboxSong, "id" | "freePlayLimit">,
  plays: Record<string, number>,
  catalogUnlocked: boolean,
  storage: Pick<SongPlayStorage, "setItem">,
): { allowed: boolean; plays: Record<string, number> } {
  const currentPlays = plays[song.id] ?? 0;
  if (!catalogUnlocked && currentPlays >= song.freePlayLimit) {
    return { allowed: false, plays };
  }

  const updated = { ...plays, [song.id]: currentPlays + 1 };
  storage.setItem(SONG_PLAYS_STORAGE_KEY, JSON.stringify(updated));
  return { allowed: true, plays: updated };
}

export async function loadUnlockedJukeboxCatalog(
  currentSongs: HomepageJukeboxSong[],
  fetcher: (url: string) => Promise<{
    ok: boolean;
    json: () => Promise<unknown>;
  }> = fetch,
): Promise<HomepageJukeboxSong[]> {
  const response = await fetcher("/api/songs?unlock=1");
  if (!response.ok) throw new Error("Unlocked catalog could not be loaded");
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error("Unlocked catalog is invalid");

  const merged = new Map(currentSongs.map((song) => [song.id, song]));
  for (const value of payload) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const candidate = value as HomepageJukeboxSong;
    if (typeof candidate.id === "string" && candidate.id) {
      merged.set(candidate.id, candidate);
    }
  }
  return [...merged.values()];
}
