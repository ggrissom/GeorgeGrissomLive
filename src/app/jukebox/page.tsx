export const dynamic = "force-dynamic";

import { JukeboxPlayer } from "@/components/jukebox/jukebox-player";
import { prisma } from "@/lib/db";
import { toPublicJukeboxSong } from "@/lib/jukebox";

export default async function JukeboxPage() {
  const songs = await prisma.song.findMany({
    where: { isPublic: true },
    orderBy: [{ jukeboxOrder: "asc" }, { title: "asc" }],
  });

  return <JukeboxPlayer initialSongs={songs.map(toPublicJukeboxSong)} standalone />;
}
