import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { HomepageJukeboxSong } from "@/lib/homepage-jukebox";
import SiteShell from "./site-shell";

(globalThis as { React?: typeof React }).React = React;

const publicPlayerSong: HomepageJukeboxSong = {
  id: "jukebox-public",
  title: "Public Player Song",
  artist: "George Grissom",
  albumLabel: "SINGLE",
  audioUrl: "/audio/public.mp3",
  durationSeconds: 60,
  jukeboxOrder: 10,
  playable: true,
  genre: null,
  mood: null,
  tempoLabel: null,
  requestable: false,
  publicShortlist: false,
  paidCatalog: false,
  minTipCents: 0,
  freePlayLimit: 2,
};

test("homepage player and request picker consume separate public datasets", () => {
  const originalConsoleError = console.error;
  console.error = (message?: unknown, ...args: unknown[]) => {
    if (String(message).includes("Invalid value for prop")) return;
    originalConsoleError(message, ...args);
  };
  let markup: string;
  try {
    markup = renderToStaticMarkup(
      createElement(SiteShell, {
        initialEvents: [],
        initialJukeboxSongs: [publicPlayerSong],
        initialRequestSongs: [
          { id: "requestable", title: "Requestable Shortlist Song", artist: "Guest" },
        ],
      }),
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.match(markup, /Public Player Song/);
  assert.match(markup, /value="requestable">Requestable Shortlist Song — Guest/);
  assert.doesNotMatch(markup, /value="jukebox-public">Public Player Song/);
  assert.match(markup, /Browse the catalog, choose a title card, then play/);
  assert.match(markup, /flipbook catalog/);
});
