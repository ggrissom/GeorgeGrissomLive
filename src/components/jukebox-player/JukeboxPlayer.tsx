"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject
} from "react";
import { DEFAULT_MAX_TITLE_PX, fitSingleLineFontSize } from "@/lib/fit-single-line-text";
import { adjacentSongIndex, dedupeSongs } from "./player-state";
import styles from "./JukeboxPlayer.module.css";

export type JukeboxSong = {
  id: string;
  slug?: string | null;
  title: string;
  artist?: string | null;
  album?: string | null;
  genre?: string | null;
  mood?: string | null;
  tempoLabel?: string | null;
  durationSeconds?: number | null;
  previewUrl?: string | null;
  downloadPriceCents?: number;
  minTipCents?: number;
  freePlayLimit: number;
};

type Props = {
  songs: JukeboxSong[];
  plays: Record<string, number>;
  catalogUnlocked: boolean;
  currentSong: JukeboxSong | null;
  selectedSongId?: string;
  onSelect: (song: JukeboxSong) => void;
  onPlay: (song: JukeboxSong) => void | Promise<void>;
  audioRef: RefObject<HTMLAudioElement | null>;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function NowPlayingTitle({ title }: { title: string }) {
  const titleRef = useRef<HTMLElement>(null);
  const [fontSize, setFontSize] = useState(DEFAULT_MAX_TITLE_PX);

  useEffect(() => {
    const element = titleRef.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const current = titleRef.current;
        if (!current) return;
        current.style.fontSize = `${DEFAULT_MAX_TITLE_PX}px`;
        setFontSize(fitSingleLineFontSize({
          availableWidth: current.clientWidth,
          measuredWidth: current.scrollWidth
        }));
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.parentElement) observer.observe(element.parentElement);
    window.addEventListener("orientationchange", measure);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("resize", measure);
    };
  }, [title]);

  return (
    <strong
      ref={titleRef}
      className={styles.nowTitle}
      title={title}
      style={{ fontSize: `${fontSize}px` }}
    >
      {title}
    </strong>
  );
}

export default function JukeboxPlayer({
  songs,
  plays,
  catalogUnlocked,
  currentSong,
  selectedSongId,
  onSelect,
  onPlay,
  audioRef
}: Props) {
  const playerSongs = useMemo(() => dedupeSongs(songs), [songs]);
  const [playingSong, setPlayingSong] = useState<JukeboxSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const currentSongRef = useRef<JukeboxSong | null>(currentSong);
  const pendingSongRef = useRef<JukeboxSong | null>(null);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncTime = () => setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
    const syncDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const syncVolume = () => {
      setMuted(audio.muted || audio.volume === 0);
      setVolume(audio.volume);
    };
    const handlePlay = () => {
      const started = pendingSongRef.current || currentSongRef.current;
      if (started) setPlayingSong(started);
      pendingSongRef.current = null;
      setIsPlaying(true);
      syncDuration();
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleEmptied = () => {
      setCurrentTime(0);
      setDuration(0);
    };

    syncTime();
    syncDuration();
    syncVolume();
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("volumechange", syncVolume);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("emptied", handleEmptied);
    return () => {
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("volumechange", syncVolume);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("emptied", handleEmptied);
    };
  }, [audioRef]);

  const selectedSong = useMemo(
    () => playerSongs.find(song => song.id === selectedSongId || song.slug === selectedSongId) || currentSong || null,
    [playerSongs, selectedSongId, currentSong]
  );
  const displaySong = playingSong;
  const displayDuration = duration || displaySong?.durationSeconds || 0;
  const progressPercent = displayDuration > 0
    ? Math.max(0, Math.min(100, (currentTime / displayDuration) * 100))
    : 0;

  function startSong(song: JukeboxSong) {
    pendingSongRef.current = song;
    onSelect(song);
    void onPlay(song);
  }

  function moveSong(delta: number) {
    if (!playerSongs.length) return;
    const anchor = playingSong || selectedSong || playerSongs[0];
    const index = Math.max(0, playerSongs.findIndex(song => song.id === anchor.id));
    const nextIndex = adjacentSongIndex(index, delta, playerSongs.length);
    if (nextIndex >= 0) startSong(playerSongs[nextIndex]);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !playerSongs.length) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    const target = selectedSong || playingSong || playerSongs[0];
    if (playingSong?.id === target.id && audio.src) {
      void audio.play();
      return;
    }
    startSong(target);
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.volume === 0 && !audio.muted) audio.volume = 1;
    audio.muted = !audio.muted;
  }

  function changeVolume(next: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, next));
    audio.muted = false;
  }

  function seek(next: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(next) || !displayDuration) return;
    audio.currentTime = Math.max(0, Math.min(displayDuration, next));
    setCurrentTime(audio.currentTime);
  }

  return (
    <div className={styles.module}>
      <div className={styles.skin}>
        <img
          className={styles.skinImage}
          src="/images/reference-jukebox.png"
          alt="George Grissom jukebox player"
          draggable={false}
        />

        <div className={styles.transport} aria-label="Audio controls">
          <button type="button" className={styles.transportButton} onClick={() => moveSong(-1)} disabled={!playerSongs.length} aria-label="Previous song">⏮</button>
          <button type="button" className={`${styles.transportButton} ${styles.playButton}`} onClick={togglePlay} disabled={!playerSongs.length} aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? "Ⅱ" : "▶"}</button>
          <button type="button" className={styles.transportButton} onClick={() => moveSong(1)} disabled={!playerSongs.length} aria-label="Next song">⏭</button>
          <div className={styles.volumeGroup}>
            <button type="button" className={styles.muteIcon} onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute" : "Mute"}>{muted ? "🔇" : "🔊"}</button>
            <input
              className={styles.volumeSlider}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={event => changeVolume(Number(event.target.value))}
              aria-label="Volume"
              style={{ "--volume": `${volume * 100}%` } as CSSProperties}
            />
          </div>
        </div>

        <div className={styles.nowPlaying} aria-live="polite">
          <span>★ NOW PLAYING ★</span>
          <NowPlayingTitle title={displaySong?.title || "Pick a song"} />
          <small>{displaySong?.artist || "George Grissom"}</small>
        </div>

        <div className={styles.progress}>
          <span>{formatTime(currentTime)}</span>
          <input
            className={styles.progressSlider}
            type="range"
            min="0"
            max={displayDuration || 1}
            step="0.1"
            value={Math.min(currentTime, displayDuration || 0)}
            onChange={event => seek(Number(event.target.value))}
            disabled={!displayDuration}
            aria-label="Song progress"
            style={{ "--progress": `${progressPercent}%` } as CSSProperties}
          />
          <span>{formatTime(displayDuration)}</span>
        </div>

        <div className={styles.pickerWindow}>
          <JukeboxSongWheel
            songs={playerSongs}
            plays={plays}
            catalogUnlocked={catalogUnlocked}
            selectedSongId={selectedSongId}
            onSelect={onSelect}
            onPlay={startSong}
            compact
          />
        </div>
      </div>
      <audio ref={audioRef} preload="metadata" className={styles.hiddenAudio} />
    </div>
  );
}

export function JukeboxSongWheel({
  songs,
  selectedSongId,
  onSelect,
  onPlay,
  compact = false
}: {
  songs: JukeboxSong[];
  plays?: Record<string, number>;
  catalogUnlocked?: boolean;
  selectedSongId?: string;
  onSelect: (song: JukeboxSong) => void;
  onPlay: (song: JukeboxSong) => void | Promise<void>;
  visibleRadius?: number;
  compact?: boolean;
}) {
  const playerSongs = useMemo(() => dedupeSongs(songs), [songs]);
  const trackRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(0, playerSongs.findIndex(song => song.id === selectedSongId || song.slug === selectedSongId));

  useEffect(() => {
    if (!compact || !trackRef.current) return;
    const row = trackRef.current.querySelector<HTMLElement>(`[data-song-index="${selectedIndex}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [compact, selectedIndex]);

  return (
    <div className={compact ? styles.compactPicker : styles.fullPicker}>
      <div ref={trackRef} className={styles.pickerTrack} role="listbox" aria-label="Jukebox song picker">
        {playerSongs.map((song, index) => {
          const active = index === selectedIndex && Boolean(selectedSongId);
          return (
            <button
              key={song.slug || song.id}
              data-song-index={index}
              type="button"
              role="option"
              aria-selected={active}
              className={active ? `${styles.pickerRow} ${styles.activeRow}` : styles.pickerRow}
              onClick={() => {
                onSelect(song);
                void onPlay(song);
              }}
            >
              <strong>{song.title}</strong>
              {song.durationSeconds ? <span>{formatTime(song.durationSeconds)}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
