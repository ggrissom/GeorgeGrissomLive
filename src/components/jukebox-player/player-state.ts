export type SongIdentity = {
  id: string;
  slug?: string | null;
  title: string;
};

export function dedupeSongs<T extends SongIdentity>(songs: T[]): T[] {
  const seen = new Set<string>();
  return songs.filter(song => {
    const key = song.slug?.trim().toLowerCase() || song.title.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function adjacentSongIndex(index: number, delta: number, length: number): number {
  if (length <= 0) return -1;
  return ((index + delta) % length + length) % length;
}
