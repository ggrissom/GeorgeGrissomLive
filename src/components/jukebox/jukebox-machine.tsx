"use client";

import React, { useState, type RefObject } from "react";

import { formatDuration, type PublicJukeboxSong } from "@/lib/jukebox";

type JukeboxMachineProps = {
  song: PublicJukeboxSong | null;
  playing: boolean;
  loading: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  canGoPrevious: boolean;
  canGoNext: boolean;
  catalogButtonRef: RefObject<HTMLButtonElement>;
  onOpenCatalog: () => void;
  onPrevious: () => void;
  onTogglePlayback: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onRetry: () => void;
};

export function JukeboxMachine({
  song,
  playing,
  loading,
  currentTime,
  duration,
  error,
  canGoPrevious,
  canGoNext,
  catalogButtonRef,
  onOpenCatalog,
  onPrevious,
  onTogglePlayback,
  onNext,
  onSeek,
  onRetry,
}: JukeboxMachineProps) {
  const [artworkFailed, setArtworkFailed] = useState(false);
  const displayDuration = duration || song?.durationSeconds || 0;
  const unavailable = Boolean(song && !song.playable);

  return (
    <div className="reference-jukebox-module jukebox-machine">
      <div className={artworkFailed ? "reference-jukebox artwork-failed" : "reference-jukebox"}>
        {!artworkFailed && (
          <img
            className="reference-jukebox-photo"
            src="/images/jukebox-basis-2026-08-01.jpeg"
            alt="Classic chrome jukebox"
            draggable={false}
            onError={() => setArtworkFailed(true)}
          />
        )}

        <div className="reference-jukebox-now" aria-live="polite">
          <span>NOW PLAYING</span>
          <strong>{song?.title ?? "Songs coming soon"}</strong>
          <small>{song?.artist ?? "Catalog unavailable"}</small>
          <small>{loading ? "Loading…" : playing ? "Playing" : "Paused"}</small>
        </div>

        <div className="jukebox-machine-controls">
          <div className="jukebox-machine-buttons">
            <button
              type="button"
              aria-label="Previous playable song"
              onClick={onPrevious}
              disabled={!canGoPrevious}
            >
              Previous
            </button>
            <button
              type="button"
              aria-label={playing ? "Pause current song" : "Play current song"}
              onClick={onTogglePlayback}
              disabled={!song || unavailable}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              aria-label="Next playable song"
              onClick={onNext}
              disabled={!canGoNext}
            >
              Next
            </button>
            <button
              ref={catalogButtonRef}
              type="button"
              onClick={onOpenCatalog}
              aria-haspopup="dialog"
            >
              Catalog
            </button>
          </div>

          <label className="jukebox-machine-progress">
            <span className="sr-only">Seek {song?.title ?? "current song"}</span>
            <span aria-hidden="true">
              {formatDuration(currentTime)} / {formatDuration(displayDuration || null)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, displayDuration)}
              step={1}
              value={Math.min(currentTime, Math.max(0, displayDuration))}
              aria-label={`Seek ${song?.title ?? "current song"}`}
              disabled={!song?.playable || displayDuration <= 0}
              onChange={(event) => onSeek(Number(event.target.value))}
            />
          </label>
        </div>
      </div>

      {artworkFailed && (
        <p className="jukebox-machine-status" role="status">
          Artwork unavailable. Player controls remain available.
        </p>
      )}
      {!song && (
        <p className="jukebox-machine-status" role="status">Songs coming soon.</p>
      )}
      {unavailable && (
        <p className="jukebox-machine-status" role="status">
          This track is currently unavailable.
        </p>
      )}
      {error && (
        <div className="jukebox-machine-error" role="alert">
          <p>{error}</p>
          {song?.playable && (
            <button type="button" onClick={onRetry}>Retry playback</button>
          )}
        </div>
      )}
    </div>
  );
}
