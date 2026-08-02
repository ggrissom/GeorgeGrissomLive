import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { toPublicJukeboxSong, type PublicJukeboxSong } from "@/lib/jukebox";
import {
  clampCatalogPage,
  closeCatalogAndRestoreFocus,
  getCatalogSpreadStart,
  getTouchPageGesture,
  moveCatalogSpread,
  selectCatalogSong,
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

function renderClosedCatalog(songs: PublicJukeboxSong[]) {
  return renderToStaticMarkup(
    createElement(JukeboxCatalog, {
      songs,
      open: false,
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

  assert.equal((markup.match(/<button class="jukebox-song-card/g) ?? []).length, 6);
  assert.doesNotMatch(markup, /class="jukebox-song-card"[^>]*>\s*<\/button>/);
});

test("catalog opens on the selected song's nonblank spread", () => {
  const songs = makeSongs(11);
  const markup = renderCatalog(songs, "song-11");

  assert.match(markup, />Song 11</);
  assert.equal((markup.match(/<button class="jukebox-song-card/g) ?? []).length, 1);
  assert.doesNotMatch(markup, />Song 10</);
});

test("desktop catalog normalizes a selected second page to its containing spread", () => {
  const markup = renderCatalog(makeSongs(10), "song-6");

  assert.equal(getCatalogSpreadStart(1), 0);
  assert.match(markup, /data-page-index="0"/);
  assert.match(markup, /disabled="" aria-label="Previous catalog spread"/);
  assert.match(markup, /disabled="" aria-label="Next catalog spread"/);
});

test("desktop spread movement always lands on an even page start", () => {
  assert.equal(moveCatalogSpread(1, 1, 3), 2);
  assert.equal(moveCatalogSpread(2, 1, 3), 2);
  assert.equal(moveCatalogSpread(2, -1, 3), 0);
});

test("closed catalog stays mounted for transition but is hidden from assistive technology", () => {
  const markup = renderClosedCatalog(makeSongs(1));

  assert.match(markup, /class="jukebox-catalog is-closed"/);
  assert.match(markup, /aria-hidden="true"/);
  assert.doesNotMatch(markup, /aria-modal="true"/);
});

test("catalog exposes separate page controls for narrow vertical navigation", () => {
  const markup = renderCatalog(makeSongs(11));

  assert.match(markup, /aria-label="Previous catalog page"/);
  assert.match(markup, /aria-label="Next catalog page"/);
});

test("short desktop catalog fits five complete 44px cards at 1024 by 768", () => {
  const css = readFileSync(
    new URL("../../app/globals.css", import.meta.url),
    "utf8",
  );
  const value = (name: string) => {
    const match = css.match(new RegExp(`--${name}:\\s*([0-9.]+)`));
    assert.ok(match, `missing CSS sizing invariant ${name}`);
    return Number(match[1]);
  };
  const available =
    768 * (value("jukebox-short-height-vh") / 100) -
    2 * value("jukebox-short-border-px") -
    2 * value("jukebox-short-chrome-px") -
    2 * value("jukebox-short-spread-pad-px") -
    2 * value("jukebox-short-page-pad-px");
  const required =
    5 * value("jukebox-short-card-min-px") +
    4 * value("jukebox-short-card-gap-px");

  assert.ok(available >= required, `${available}px available for ${required}px of cards`);
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

test("song selection closes through the focus-restoring catalog path", () => {
  const song = makeSongs(1)[0];
  const actions: string[] = [];
  const opener = {
    current: {
      focus() {
        actions.push("focus");
      },
    },
  };
  const close = () =>
    closeCatalogAndRestoreFocus(
      () => actions.push("close"),
      opener,
      (callback) => callback(),
    );

  selectCatalogSong(song, () => actions.push("select"), close);

  assert.deepEqual(actions, ["select", "close", "focus"]);
});

test("open catalog uses drawer semantics rather than claiming an untrapped modal", () => {
  const markup = renderCatalog(makeSongs(1));

  assert.doesNotMatch(markup, /aria-modal=/);
  assert.doesNotMatch(markup, /role="dialog"/);
  assert.match(markup, /aria-label="Jukebox song catalog"/);
});
