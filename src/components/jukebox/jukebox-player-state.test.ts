import assert from "node:assert/strict";
import test from "node:test";

import type { PublicJukeboxSong } from "@/lib/jukebox";
import {
  chooseInitialSong,
  findAdjacentPlayableSong,
  reconcileSelectedSong,
} from "./jukebox-player-state";

function song(id: string, playable: boolean): PublicJukeboxSong {
  return {
    id,
    title: id,
    artist: "George Grissom",
    albumLabel: "SINGLE",
    audioUrl: playable ? `/audio/${id}.mp3` : null,
    durationSeconds: null,
    jukeboxOrder: 0,
    playable,
  };
}

test("initial selection prefers the first playable song", () => {
  const songs = [song("missing", false), song("ready", true)];
  assert.equal(chooseInitialSong(songs)?.id, "ready");
});

test("initial selection exposes a deliberate unavailable song when none play", () => {
  assert.equal(chooseInitialSong([song("missing", false)])?.id, "missing");
  assert.equal(chooseInitialSong([]), null);
});

test("adjacent navigation skips unavailable songs without wrapping", () => {
  const songs = [song("one", true), song("missing", false), song("three", true)];
  assert.equal(findAdjacentPlayableSong(songs, "one", 1)?.id, "three");
  assert.equal(findAdjacentPlayableSong(songs, "three", -1)?.id, "one");
  assert.equal(findAdjacentPlayableSong(songs, "three", 1), null);
});

test("catalog reconciliation keeps present selection and replaces deleted selection", () => {
  const songs = [song("missing", false), song("ready", true)];
  assert.equal(reconcileSelectedSong(songs, "missing")?.id, "missing");
  assert.equal(reconcileSelectedSong(songs, "deleted")?.id, "ready");
  assert.equal(reconcileSelectedSong([], "deleted"), null);
});
