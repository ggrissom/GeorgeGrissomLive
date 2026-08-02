"use client";

import React, { useEffect, useRef, useState, type RefObject } from "react";

import type { PublicJukeboxSong } from "@/lib/jukebox";
import { JukeboxCatalog } from "./jukebox-catalog";
import { JukeboxMachine } from "./jukebox-machine";
import {
  cancelPlaybackAttempt,
  runAuthorizedPlayback,
  runPlaybackAttempt,
  runReloadedPlaybackAttempt,
} from "./jukebox-playback";
import {
  chooseInitialSong,
  findAdjacentPlayableSong,
  reconcileSelectedSong,
} from "./jukebox-player-state";

type JukeboxPlayerProps = {
  initialSongs: PublicJukeboxSong[];
  standalone?: boolean;
  onBeforePlayback?: (
    song: PublicJukeboxSong,
  ) => boolean | Promise<boolean>;
  getPlayStatus?: (song: PublicJukeboxSong) => string;
};

export function JukeboxPlayer({
  initialSongs,
  standalone = false,
  onBeforePlayback,
  getPlayStatus,
}: JukeboxPlayerProps) {
  const initialSelection = chooseInitialSong(initialSongs);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(
    initialSelection?.id ?? null,
  );
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    initialSelection?.durationSeconds ?? 0,
  );
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const catalogButtonRef = useRef<HTMLButtonElement>(null);
  const songsRef = useRef(initialSongs);
  const selectedSongIdRef = useRef(selectedSongId);
  const playbackGenerationRef = useRef(0);
  const beforePlaybackRef = useRef(onBeforePlayback);

  const selectedSong =
    initialSongs.find((song) => song.id === selectedSongId) ?? null;
  const previousSong = findAdjacentPlayableSong(
    initialSongs,
    selectedSongId,
    -1,
  );
  const nextSong = findAdjacentPlayableSong(initialSongs, selectedSongId, 1);

  songsRef.current = initialSongs;
  selectedSongIdRef.current = selectedSongId;
  beforePlaybackRef.current = onBeforePlayback;

  function resetTrackState(song: PublicJukeboxSong | null) {
    setCurrentTime(0);
    setDuration(song?.durationSeconds ?? 0);
    setPlaying(false);
    setLoading(false);
    setError(null);
  }

  async function playSongAudio(song: PublicJukeboxSong, reload: boolean) {
    const audio = audioRef.current;
    if (!audio || !song.audioUrl) return;

    const generation = ++playbackGenerationRef.current;
    setLoading(true);
    setError(null);
    const attempt = {
      source: song.audioUrl,
      generation,
      isCurrent: (attemptGeneration: number) =>
        attemptGeneration === playbackGenerationRef.current,
    };
    const result = reload
      ? await runReloadedPlaybackAttempt(audio, attempt)
      : await runPlaybackAttempt(audio, { ...attempt, reload: false });

    if (result === "stale") return;

    setLoading(false);
    if (result === "blocked") {
      setPlaying(false);
      setError("Tap play to start");
    }
  }

  async function selectAndPlay(song: PublicJukeboxSong) {
    await runAuthorizedPlayback(
      () => beforePlaybackRef.current?.(song) ?? true,
      async () => {
        setSelectedSongId(song.id);
        selectedSongIdRef.current = song.id;
        resetTrackState(song);

        if (!song.audioUrl) {
          ++playbackGenerationRef.current;
          const audio = audioRef.current;
          audio?.pause();
          audio?.removeAttribute("src");
          audio?.load();
          setError("This track is currently unavailable.");
          return;
        }

        await playSongAudio(song, true);
      },
    );
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const nextSelection = reconcileSelectedSong(
      initialSongs,
      selectedSongIdRef.current,
    );
    const currentStillExists = initialSongs.some(
      (song) => song.id === selectedSongIdRef.current,
    );

    if (!currentStillExists) {
      ++playbackGenerationRef.current;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      resetTrackState(nextSelection);
      setSelectedSongId(nextSelection?.id ?? null);
      selectedSongIdRef.current = nextSelection?.id ?? null;
    }

    songsRef.current = initialSongs;
  }, [initialSongs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!selectedSong?.audioUrl) {
      ++playbackGenerationRef.current;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    if (audio.getAttribute("src") !== selectedSong.audioUrl) {
      ++playbackGenerationRef.current;
      audio.pause();
      audio.src = selectedSong.audioUrl;
      audio.load();
      setCurrentTime(0);
      setDuration(selectedSong.durationSeconds ?? 0);
    }
  }, [selectedSong?.audioUrl, selectedSong?.durationSeconds]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const audioElement: HTMLAudioElement = audio;

    function onTimeUpdate() {
      setCurrentTime(audioElement.currentTime || 0);
    }
    function onDurationChange() {
      if (Number.isFinite(audioElement.duration)) setDuration(audioElement.duration);
    }
    function onPlay() {
      setPlaying(true);
      setError(null);
    }
    function onPause() {
      setPlaying(false);
      setLoading(false);
    }
    function onEnded() {
      setPlaying(false);
      const next = findAdjacentPlayableSong(
        songsRef.current,
        selectedSongIdRef.current,
        1,
      );
      if (next) void selectAndPlay(next);
    }
    function onError() {
      setPlaying(false);
      setLoading(false);
      setError("Audio failed to load.");
    }

    audioElement.addEventListener("timeupdate", onTimeUpdate);
    audioElement.addEventListener("durationchange", onDurationChange);
    audioElement.addEventListener("play", onPlay);
    audioElement.addEventListener("pause", onPause);
    audioElement.addEventListener("ended", onEnded);
    audioElement.addEventListener("error", onError);

    return () => {
      ++playbackGenerationRef.current;
      audioElement.pause();
      audioElement.removeEventListener("timeupdate", onTimeUpdate);
      audioElement.removeEventListener("durationchange", onDurationChange);
      audioElement.removeEventListener("play", onPlay);
      audioElement.removeEventListener("pause", onPause);
      audioElement.removeEventListener("ended", onEnded);
      audioElement.removeEventListener("error", onError);
    };
  }, []);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !selectedSong?.audioUrl) return;

    if (!audio.paused) {
      cancelPlaybackAttempt(audio, playbackGenerationRef, () => {
        setLoading(false);
      });
      return;
    }

    await runAuthorizedPlayback(
      () => beforePlaybackRef.current?.(selectedSong) ?? true,
      () => playSongAudio(selectedSong, false),
    );
  }

  async function retryPlayback() {
    if (!selectedSong?.audioUrl) return;
    setCurrentTime(0);
    setDuration(selectedSong.durationSeconds ?? 0);
    await playSongAudio(selectedSong, true);
  }

  function seek(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  }

  return (
    <section
      className={standalone ? "jukebox-player is-standalone" : "jukebox-player"}
      aria-label="Jukebox player"
    >
      <JukeboxMachine
        song={selectedSong}
        playing={playing}
        loading={loading}
        currentTime={currentTime}
        duration={duration}
        error={error}
        playStatus={selectedSong && getPlayStatus ? getPlayStatus(selectedSong) : undefined}
        canGoPrevious={Boolean(previousSong)}
        canGoNext={Boolean(nextSong)}
        catalogButtonRef={catalogButtonRef}
        onOpenCatalog={() => setCatalogOpen(true)}
        onPrevious={() => previousSong && void selectAndPlay(previousSong)}
        onTogglePlayback={() => void togglePlayback()}
        onNext={() => nextSong && void selectAndPlay(nextSong)}
        onSeek={seek}
        onRetry={() => void retryPlayback()}
      />

      <JukeboxCatalog
        songs={initialSongs}
        selectedSongId={selectedSongId ?? undefined}
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onSelect={(song) => {
          void selectAndPlay(song);
        }}
        openerRef={catalogButtonRef as RefObject<HTMLElement | null>}
      />

      <audio ref={audioRef} preload="metadata" className="jukebox-audio-element" />
    </section>
  );
}
