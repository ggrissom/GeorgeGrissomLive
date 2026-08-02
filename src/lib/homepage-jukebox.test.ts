import assert from "node:assert/strict";
import test from "node:test";

import {
  consumeStoredSongPlay,
  loadUnlockedJukeboxCatalog,
  readStoredSongPlays,
  toHomepageJukeboxSong,
  toPublicRequestSong,
  type HomepageJukeboxSong,
} from "./homepage-jukebox";

function song(
  id: string,
  overrides: Partial<HomepageJukeboxSong> = {},
): HomepageJukeboxSong {
  return {
    id,
    title: `Song ${id}`,
    artist: "George Grissom",
    albumLabel: "SINGLE",
    audioUrl: `/audio/${id}.mp3`,
    durationSeconds: 60,
    jukeboxOrder: 10,
    playable: true,
    genre: null,
    mood: null,
    tempoLabel: null,
    requestable: true,
    publicShortlist: true,
    paidCatalog: false,
    minTipCents: 25,
    freePlayLimit: 2,
    ...overrides,
  };
}

test("persists allowed song plays and gates the first play beyond freePlayLimit", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  let plays = readStoredSongPlays(storage);

  const first = consumeStoredSongPlay(song("one"), plays, false, storage);
  assert.equal(first.allowed, true);
  plays = first.plays;
  const second = consumeStoredSongPlay(song("one"), plays, false, storage);
  assert.equal(second.allowed, true);
  plays = second.plays;
  const gated = consumeStoredSongPlay(song("one"), plays, false, storage);

  assert.deepEqual(gated, { allowed: false, plays: { one: 2 } });
  assert.equal(values.get("gg-song-plays"), '{"one":2}');

  const unlocked = consumeStoredSongPlay(song("one"), plays, true, storage);
  assert.deepEqual(unlocked, { allowed: true, plays: { one: 3 } });
  assert.equal(values.get("gg-song-plays"), '{"one":3}');
});

test("loads the paid endpoint and expands rather than replaces the public jukebox", async () => {
  const publicSong = song("public");
  const paidSong = song("paid", { paidCatalog: true });
  const requestedUrls: string[] = [];

  const expanded = await loadUnlockedJukeboxCatalog(
    [publicSong],
    async (url) => {
      requestedUrls.push(url);
      return {
        ok: true,
        json: async () => [paidSong],
      };
    },
  );

  assert.deepEqual(requestedUrls, ["/api/songs?unlock=1"]);
  assert.deepEqual(expanded.map((entry) => entry.id), ["public", "paid"]);
});

test("homepage projections expose only allow-listed player and request fields", () => {
  const input = {
    id: "one",
    title: "One",
    artist: "George Grissom",
    album: "Live",
    audioUrl: "/audio/one.mp3",
    durationSeconds: 65,
    jukeboxOrder: 10,
    genre: "Soul",
    mood: "Warm",
    tempoLabel: "Medium",
    requestable: true,
    publicShortlist: true,
    paidCatalog: true,
    minTipCents: 25,
    freePlayLimit: 2,
    privateLyricsNotes: "secret lyrics",
    privateChordNotes: "secret chords",
    privateRehearsalNotes: "secret rehearsal",
    audioStoragePath: "jukebox-audio/private-path.mp3",
  };

  const playerSong = toHomepageJukeboxSong(input);
  const requestSong = toPublicRequestSong(input);

  assert.deepEqual(requestSong, {
    id: "one",
    title: "One",
    artist: "George Grissom",
  });
  for (const privateField of [
    "privateLyricsNotes",
    "privateChordNotes",
    "privateRehearsalNotes",
    "audioStoragePath",
  ]) {
    assert.equal(privateField in playerSong, false);
    assert.equal(privateField in requestSong, false);
  }
});
