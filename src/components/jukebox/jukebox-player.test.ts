import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { PublicJukeboxSong } from "@/lib/jukebox";
import { JukeboxPlayer } from "./jukebox-player";

const playableSong: PublicJukeboxSong = {
  id: "one",
  title: "One More Song",
  artist: "George Grissom",
  albumLabel: "SINGLE",
  audioUrl: "/audio/one.mp3",
  durationSeconds: 65,
  jukeboxOrder: 10,
  playable: true,
};

test("player renders one audio element and accessible machine controls", () => {
  const markup = renderToStaticMarkup(
    createElement(JukeboxPlayer, { initialSongs: [playableSong], standalone: true }),
  );

  assert.equal((markup.match(/<audio/g) ?? []).length, 1);
  assert.match(markup, /alt="Classic chrome jukebox"/);
  assert.match(markup, /aria-label="Seek One More Song"/);
  assert.match(markup, />Catalog</);
  assert.match(markup, />Play</);
});

test("empty player renders a deliberate coming-soon state", () => {
  const markup = renderToStaticMarkup(
    createElement(JukeboxPlayer, { initialSongs: [] }),
  );

  assert.match(markup, /Songs coming soon/);
  assert.equal((markup.match(/<audio/g) ?? []).length, 1);
});

test("shared player renders the homepage free-play status", () => {
  const markup = renderToStaticMarkup(
    createElement(JukeboxPlayer, {
      initialSongs: [playableSong],
      getPlayStatus: () => "1 FREE PLAY LEFT",
    }),
  );

  assert.match(markup, />1 FREE PLAY LEFT</);
});
