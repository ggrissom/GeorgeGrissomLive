import assert from "node:assert/strict";
import test from "node:test";

import {
  createSpreads,
  formatDuration,
  paginateSongs,
  toPublicJukeboxSong,
} from "./jukebox";

for (const count of [0, 1, 5, 6, 10, 11, 20, 21]) {
  test(`catalog pagination preserves ${count} songs without blanks`, () => {
    const songs = Array.from({ length: count }, (_, index) => ({
      id: `song-${index + 1}`,
    }));

    const pages = paginateSongs(songs);
    const spreads = createSpreads(pages);

    assert.deepEqual(
      pages.flat().map((song) => song.id),
      songs.map((song) => song.id),
    );
    assert.ok(pages.every((page) => page.length > 0 && page.length <= 5));
    assert.ok(
      spreads.every(
        (spread) =>
          spread.left.length > 0 &&
          (spread.right === undefined || spread.right.length > 0),
      ),
    );
    assert.deepEqual(
      spreads.flatMap((spread) => [...spread.left, ...(spread.right ?? [])]).map((song) => song.id),
      songs.map((song) => song.id),
    );
  });
}

test("uses public jukebox display fallbacks", () => {
  const song = toPublicJukeboxSong({ id: "1", title: "One", album: null });

  assert.equal(song.albumLabel, "SINGLE");
  assert.equal(song.artist, "Unknown Artist");
  assert.equal(song.playable, false);
});

test("formats durations for catalog cards", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(null), "—");
});

test("rejects a nonpositive catalog page size", () => {
  assert.throws(() => paginateSongs([], 0), RangeError);
});
