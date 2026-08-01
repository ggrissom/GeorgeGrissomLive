export type AudioPlaybackTarget = {
  src: string;
  pause: () => void;
  load: () => void;
  play: () => Promise<void>;
};

export type PlaybackAttemptResult = "played" | "blocked" | "stale";

type PlaybackGeneration = {
  generation: number;
  isCurrent: (generation: number) => boolean;
};

export function cancelPlaybackAttempt(
  audio: Pick<AudioPlaybackTarget, "pause">,
  generation: { current: number },
  clearLoading: () => void,
): void {
  ++generation.current;
  audio.pause();
  clearLoading();
}

export async function runPlaybackAttempt(
  audio: AudioPlaybackTarget,
  options: {
    source: string;
    reload: boolean;
    generation: number;
    isCurrent: (generation: number) => boolean;
  },
): Promise<PlaybackAttemptResult> {
  if (options.reload) {
    audio.pause();
    audio.src = options.source;
    audio.load();
  }

  try {
    await audio.play();
  } catch {
    return options.isCurrent(options.generation) ? "blocked" : "stale";
  }

  return options.isCurrent(options.generation) ? "played" : "stale";
}

export function runReloadedPlaybackAttempt(
  audio: AudioPlaybackTarget,
  options: PlaybackGeneration & { source: string },
): Promise<PlaybackAttemptResult> {
  return runPlaybackAttempt(audio, { ...options, reload: true });
}
