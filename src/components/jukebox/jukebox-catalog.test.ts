import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { JukeboxCatalog } from "./jukebox-catalog";
import type { PublicJukeboxSong } from "@/lib/jukebox";

function makeSongs(count: number): PublicJukeboxSong[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `song-${index + 1}`,
    title: `Song ${index + 1}`,
    artist: "George Grissom",
    albumLabel: index === 0 ? "SINGLE" : "Live at the Lounge",
    audioUrl: index === 1 ? null : `https://audio.example/song-${index + 1}.mp3`,
    durationSeconds: index === 0 ? 65 : null,
    jukeboxOrder: index + 1,
    playable: index !== 1,
  }));
}

function renderCatalog(songs: PublicJukeboxSong[], selectedSongId?: string) {
  return renderToStaticMarkup(
    <JukeboxCatalog
      songs={songs}
      selectedSongId={selectedSongId}
      open
      onClose={() => {}}
      onSelect={() => {}}
    />,
  );
}

test("catalog cards render SINGLE, duration, and every real title on a partial spread", () => {
  const songs = makeSongs(6);
  const markup = renderCatalog(songs);

  assert.match(markup, />SINGLE</);
  assert.match(markup, />1:05</);

  for (const song of songs) {
    assert.match(markup, new RegExp(`>${song.title}</button>`));
  }

  assert.equal((markup.match(/class="jukebox-song-card/g) ?? []).length, 6);
  assert.doesNotMatch(markup, /class="jukebox-song-card"[^>]*>\s*<\/button>/);
});

test("catalog opens on the selected song's nonblank spread", () => {
  const songs = makeSongs(11);
  const markup = renderCatalog(songs, "song-11");

  assert.match(markup, />Song 11</);
  assert.equal((markup.match(/class="jukebox-song-card/g) ?? []).length, 1);
  assert.doesNotMatch(markup, />Song 10</);
});
