export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { AUDIO_CATALOG } from "@/lib/audio-catalog";
import { publicEventsFromPerformanceCalendar } from "@/lib/public-events";
import { ensureAudioCatalogSongs } from "@/lib/ensure-audio-catalog";
import SiteShell from "./site-shell";

export default async function Home() {
  try {
    await ensureAudioCatalogSongs();
  } catch (error) {
    console.error("Audio catalog repair failed", error);
  }

  const catalogSlugs = AUDIO_CATALOG.map(track => track.slug);
  const [events, databaseSongs] = await Promise.all([
    publicEventsFromPerformanceCalendar(50),
    prisma.song.findMany({
      where: { slug: { in: catalogSlugs }, isPublic: true }
    })
  ]);

  const songBySlug = new Map(databaseSongs.flatMap(song => song.slug ? [[song.slug, song] as const] : []));
  const songs = AUDIO_CATALOG.flatMap(track => {
    const song = songBySlug.get(track.slug);
    return song ? [song] : [];
  });

  return (
    <SiteShell
      initialEvents={events.map(event => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt || null,
        venueName: event.venueName,
        city: event.city,
        state: event.state,
        notes: event.notes
      }))}
      initialSongs={songs.map(song => ({
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
      }))}
    />
  );
}
