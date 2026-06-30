export type MusicSearchResult = {
  id: string;
  title: string;
  artist?: string;
  firstReleaseDate?: string;
  disambiguation?: string;
  sourceUrl: string;
};

let lastMusicBrainzCall = 0;

async function throttleMusicBrainz() {
  const delta = Date.now() - lastMusicBrainzCall;
  if (delta < 1100) {
    await new Promise(resolve => setTimeout(resolve, 1100 - delta));
  }
  lastMusicBrainzCall = Date.now();
}

export async function searchMusicBrainz(query: string): Promise<MusicSearchResult[]> {
  await throttleMusicBrainz();
  const url = new URL("https://musicbrainz.org/ws/2/recording/");
  url.searchParams.set("query", query);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "10");

  const contact = process.env.MUSICBRAINZ_CONTACT_EMAIL || "admin@example.com";
  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": `GeorgeGrissomLiveMVP/0.1 (${contact})`,
      "Accept": "application/json"
    },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz returned ${response.status}`);
  }

  const data = await response.json();
  return (data.recordings || []).map((recording: any) => {
    const artistCredit = Array.isArray(recording["artist-credit"])
      ? recording["artist-credit"].map((a: any) => a?.artist?.name || a?.name).filter(Boolean).join(", ")
      : undefined;

    return {
      id: recording.id,
      title: recording.title,
      artist: artistCredit,
      firstReleaseDate: recording["first-release-date"],
      disambiguation: recording.disambiguation,
      sourceUrl: `https://musicbrainz.org/recording/${recording.id}`
    };
  });
}

export function lyricSearchLinks(title: string, artist?: string) {
  const q = encodeURIComponent([title, artist, "lyrics chords key bpm"].filter(Boolean).join(" "));
  return {
    google: `https://www.google.com/search?q=${q}`,
    bing: `https://www.bing.com/search?q=${q}`,
    musicnotes: `https://www.musicnotes.com/search/go?w=${q}`
  };
}
