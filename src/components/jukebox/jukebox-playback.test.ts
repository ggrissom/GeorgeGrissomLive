import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelPlaybackAttempt,
  runPlaybackAttempt,
  runReloadedPlaybackAttempt,
} from "./jukebox-playback";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function audioTarget(playPromise: Promise<void>) {
  const operations: string[] = [];
  let source = "stale-source.mp3";

  return {
    operations,
    target: {
      get src() {
        return source;
      },
      set src(value: string) {
        source = value;
        operations.push(`src:${value}`);
      },
      pause() {
        operations.push("pause");
      },
      load() {
        operations.push("load");
      },
      play() {
        operations.push("play");
        return playPromise;
      },
    },
  };
}

test("a rejected obsolete play attempt cannot report a current playback error", async () => {
  const pending = deferred();
  const audio = audioTarget(pending.promise);
  let currentGeneration = 1;
  const result = runPlaybackAttempt(audio.target, {
    source: "/audio/one.mp3",
    reload: true,
    generation: 1,
    isCurrent: (generation) => generation === currentGeneration,
  });

  currentGeneration = 2;
  pending.reject(new Error("obsolete autoplay rejection"));

  assert.equal(await result, "stale");
});

test("a resolved obsolete play attempt cannot report current completion", async () => {
  const pending = deferred();
  const audio = audioTarget(pending.promise);
  let currentGeneration = 4;
  const result = runPlaybackAttempt(audio.target, {
    source: "/audio/one.mp3",
    reload: true,
    generation: 4,
    isCurrent: (generation) => generation === currentGeneration,
  });

  currentGeneration = 5;
  pending.resolve();

  assert.equal(await result, "stale");
});

test("retry restores and reloads the selected source before playing", async () => {
  const audio = audioTarget(Promise.resolve());

  const result = await runReloadedPlaybackAttempt(audio.target, {
    source: "/audio/current.mp3",
    generation: 8,
    isCurrent: (generation) => generation === 8,
  });

  assert.equal(result, "played");
  assert.deepEqual(audio.operations, [
    "pause",
    "src:/audio/current.mp3",
    "load",
    "play",
  ]);
});

test("a current rejection is reported as blocked playback", async () => {
  const audio = audioTarget(Promise.reject(new Error("autoplay blocked")));

  assert.equal(
    await runPlaybackAttempt(audio.target, {
      source: "/audio/current.mp3",
      reload: false,
      generation: 9,
      isCurrent: (generation) => generation === 9,
    }),
    "blocked",
  );
});

test("canceling a pending attempt clears loading and stale completion cannot restore it", async () => {
  const pending = deferred();
  const audio = audioTarget(pending.promise);
  const generation = { current: 12 };
  let loading = true;
  const result = runPlaybackAttempt(audio.target, {
    source: "/audio/current.mp3",
    reload: false,
    generation: generation.current,
    isCurrent: (attemptGeneration) =>
      attemptGeneration === generation.current,
  });

  cancelPlaybackAttempt(audio.target, generation, () => {
    loading = false;
  });
  pending.resolve();

  assert.equal(await result, "stale");
  assert.equal(generation.current, 13);
  assert.equal(loading, false);
  assert.deepEqual(audio.operations, ["play", "pause"]);
});
