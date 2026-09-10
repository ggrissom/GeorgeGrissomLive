import test from "node:test";
import assert from "node:assert/strict";
import { adjacentSongIndex, dedupeSongs } from "./player-state";

test("dedupeSongs keeps one entry per canonical slug/title", () => {
  const songs = [
    { id: "1", slug: "one-question", title: "One Question" },
    { id: "2", slug: "one-question", title: "One Question" },
    { id: "3", slug: "what-a-shame", title: "What a Shame" }
  ];

  assert.deepEqual(dedupeSongs(songs).map(song => song.slug), ["one-question", "what-a-shame"]);
});

test("adjacentSongIndex wraps previous and next", () => {
  assert.equal(adjacentSongIndex(0, -1, 7), 6);
  assert.equal(adjacentSongIndex(6, 1, 7), 0);
  assert.equal(adjacentSongIndex(3, 1, 7), 4);
});
