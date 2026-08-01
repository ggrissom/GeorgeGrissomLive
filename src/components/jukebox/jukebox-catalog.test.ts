import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { toPublicJukeboxSong, type PublicJukeboxSong } from "@/lib/jukebox";
import {
  clampCatalogPage,
  getTouchPageGesture,
} from "./jukebox-catalog-navigation";
import { JukeboxCatalog } from "./jukebox-catalog";

function makeSongs(count: number): PublicJukeboxSong[] {
  return Array.from({ length: count }, (_, index) =>
    toPublicJukeboxSong({
      id: `song-${index + 1}`,
      title: `Song ${index + 1}`,
      artist: "George Grissom",
      album: index === 0 ? null : "Live at the Lounge",
      audioUrl: index === 1 ? null : `https://audio.example/song-${index + 1}.mp3`,
      durationSeconds: index === 0 ? 65 : null,
      jukeboxOrder: index + 1,
    }),
  );
}

function renderCatalog(songs: PublicJukeboxSong[], selectedSongId?: string) {
  return renderToStaticMarkup(
    createElement(JukeboxCatalog, {
      songs,
      selectedSongId,
      open: true,
      onClose: () => {},
      onSelect: () => {},
    }),
  );
}

test("catalog cards render SINGLE, duration, and every real title on a partial spread", () => {
  const songs = makeSongs(6);
  const markup = renderCatalog(songs);

  assert.match(markup, />SINGLE</);
  assert.match(markup, />1:05</);

  for (const song of songs) {
    assert.match(markup, new RegExp(`>${song.title}</strong>`));
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

test("touch navigation advances exactly one five-song page", () => {
  assert.equal(clampCatalogPage(0, 1, 3), 1);
  assert.equal(clampCatalogPage(1, 1, 3), 2);
  assert.equal(clampCatalogPage(2, 1, 3), 2);
  assert.equal(clampCatalogPage(1, -1, 3), 0);
});

test("recognized touch swipes suppress the following card click", () => {
  assert.deepEqual(
    getTouchPageGesture({ x: 100, y: 10 }, { x: 55, y: 12 }),
    { pageDelta: 1, suppressClick: true },
  );
  assert.deepEqual(
    getTouchPageGesture({ x: 10, y: 100 }, { x: 12, y: 55 }),
    { pageDelta: 1, suppressClick: true },
  );
  assert.deepEqual(
    getTouchPageGesture({ x: 10, y: 10 }, { x: 45, y: 10 }),
    { pageDelta: 0, suppressClick: false },
  );
});
