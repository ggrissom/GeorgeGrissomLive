import type { PublicJukeboxSong } from "@/lib/jukebox";

export function chooseInitialSong(
  songs: PublicJukeboxSong[],
): PublicJukeboxSong | null {
  return songs.find((song) => song.playable) ?? songs[0] ?? null;
}

export function reconcileSelectedSong(
  songs: PublicJukeboxSong[],
  selectedSongId: string | null,
): PublicJukeboxSong | null {
  if (selectedSongId) {
    const selected = songs.find((song) => song.id === selectedSongId);
    if (selected) return selected;
  }

  return chooseInitialSong(songs);
}

export function findAdjacentPlayableSong(
  songs: PublicJukeboxSong[],
  selectedSongId: string | null,
  direction: -1 | 1,
): PublicJukeboxSong | null {
  const selectedIndex = songs.findIndex((song) => song.id === selectedSongId);
  if (selectedIndex < 0) {
    return direction === 1
      ? songs.find((song) => song.playable) ?? null
      : [...songs].reverse().find((song) => song.playable) ?? null;
  }

  for (
    let index = selectedIndex + direction;
    index >= 0 && index < songs.length;
    index += direction
  ) {
    if (songs[index].playable) return songs[index];
  }

  return null;
}
