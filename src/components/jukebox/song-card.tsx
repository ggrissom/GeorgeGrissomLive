"use client";

import type { Ref } from "react";

import { formatDuration, type PublicJukeboxSong } from "@/lib/jukebox";

export function SongCard({
  song,
  selected = false,
  onSelect,
  buttonRef,
}: {
  song: PublicJukeboxSong;
  selected?: boolean;
  onSelect: (song: PublicJukeboxSong) => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      className={selected ? "jukebox-song-card is-selected" : "jukebox-song-card"}
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={() => onSelect(song)}
    >
      <span className="jukebox-song-card-artist">{song.artist}</span>
      <strong className="jukebox-song-card-title">{song.title}</strong>
      <span className="jukebox-song-card-album">{song.albumLabel}</span>
      <span className="jukebox-song-card-duration">
        {formatDuration(song.durationSeconds)}
      </span>
      {!song.playable && (
        <span className="jukebox-song-card-unavailable">Unavailable</span>
      )}
    </button>
  );
}
