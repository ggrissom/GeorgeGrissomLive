"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type WheelEvent
} from "react";
import {
  DEFAULT_MAX_TITLE_PX,
  fitSingleLineFontSize
} from "@/lib/fit-single-line-text";
import styles from "./reference-jukebox-player.module.css";

export type JukeboxSong = {
  id: string;
  slug?: string | null;
  title: string;
  artist?: string | null;
  genre?: string | null;
  mood?: string | null;
  tempoLabel?: string | null;
  durationSeconds?: number | null;
  audioUrl?: string | null;
  minTipCents?: number;
  freePlayLimit: number;
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
        const availableWidth = current.clientWidth;
        const measuredWidth = current.scrollWidth;
        setFontSize(fitSingleLineFontSize({ availableWidth, measuredWidth }));
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
      title={title}
      style={{
        fontSize: `${fontSize}px`,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "clip",
        wordBreak: "normal",
        overflowWrap: "normal"
      }}
    >
      {title}
    </strong>
  );
}

export default function ReferenceJukebox({
  songs,
  plays,
  catalogUnlocked,
  currentSong,
  selectedSongId,
  onSelect,
  onPlay,
  audioRef
}: {
  songs: JukeboxSong[];
  plays: Record<string, number>;
  catalogUnlocked: boolean;
  currentSong: JukeboxSong | null;
  selectedSongId?: string;
  onSelect: (song: JukeboxSong) => void;
  onPlay: (song: JukeboxSong) => void | Promise<void>;
  audioRef: RefObject<HTMLAudioElement | null>;
}) {
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
      setMuted(audio.muted);
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
    () => songs.find(song => song.id === selectedSongId) || currentSong || null,
    [songs, selectedSongId, currentSong]
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
    if (!songs.length) return;
    const anchor = playingSong || selectedSong || songs[0];
    const currentIndex = Math.max(0, songs.findIndex(song => song.id === anchor.id));
    const nextIndex = (currentIndex + delta + songs.length) % songs.length;
    startSong(songs[nextIndex]);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    const target = selectedSong || playingSong || songs[0];
    if (!target) return;

    if (playingSong?.id === target.id && audio.src) {
      void audio.play();
      return;
    }

    startSong(target);
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
  }

  function changeVolume(next: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, next));
    if (audio.volume > 0 && audio.muted) audio.muted = false;
  }

  function seek(next: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(next)) return;
    audio.currentTime = Math.max(0, Math.min(displayDuration || 0, next));
    setCurrentTime(audio.currentTime);
  }

  return (
    <div className="reference-jukebox-module">
      <div className="reference-jukebox">
        <img
          className="reference-jukebox-photo"
          src="/images/reference-jukebox.png"
          alt="Classic chrome and glass jukebox"
          draggable={false}
        />

        <div className={styles.transport} aria-label="Audio controls">
          <button
            className={styles.transportButton}
            type="button"
            onClick={() => moveSong(-1)}
            disabled={!songs.length}
            aria-label="Previous song"
            title="Previous song"
          >
            ⏮
          </button>
          <button
            className={`${styles.transportButton} ${styles.playButton}`}
            type="button"
            onClick={togglePlay}
            disabled={!songs.length}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "Ⅱ" : "▶"}
          </button>
          <button
            className={styles.transportButton}
            type="button"
            onClick={() => moveSong(1)}
            disabled={!songs.length}
            aria-label="Next song"
            title="Next song"
          >
            ⏭
          </button>
          <button
            className={`${styles.transportButton} ${styles.muteButton}`}
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? "UNMUTE" : "MUTE"}
          </button>
          <label className={styles.volumeGroup}>
            <span className={styles.volumeLabel}>VOL</span>
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
          </label>
        </div>

        <div className="reference-jukebox-now" aria-live="polite">
          <span>NOW PLAYING</span>
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

        <div className="reference-jukebox-wheel-window">
          <JukeboxSongWheel
            songs={songs}
            plays={plays}
            catalogUnlocked={catalogUnlocked}
            selectedSongId={selectedSongId}
            onSelect={onSelect}
            onPlay={startSong}
            visibleRadius={3}
            compact
          />
        </div>

        <div className="reference-jukebox-credit">
          {catalogUnlocked ? "∞ CREDITS" : "2 FREE SPINS"}
        </div>
      </div>

      <audio ref={audioRef} preload="metadata" className={styles.hiddenAudio} />
    </div>
  );
}

export function JukeboxSongWheel({
  songs,
  plays,
  catalogUnlocked,
  selectedSongId,
  onSelect,
  onPlay,
  visibleRadius = 5,
  compact = false
}: {
  songs: JukeboxSong[];
  plays: Record<string, number>;
  catalogUnlocked: boolean;
  selectedSongId?: string;
  onSelect: (song: JukeboxSong) => void;
  onPlay: (song: JukeboxSong) => void | Promise<void>;
  visibleRadius?: number;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return songs;
    return songs.filter(song =>
      [song.title, song.artist, song.genre, song.mood, song.tempoLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [songs, query]);

  useEffect(() => {
    if (!filtered.length) {
      setIndex(0);
      return;
    }
    if (selectedSongId) {
      const selectedIndex = filtered.findIndex(song => song.id === selectedSongId);
      if (selectedIndex >= 0) setIndex(selectedIndex);
    } else if (index >= filtered.length) {
      setIndex(filtered.length - 1);
    }
  }, [filtered, selectedSongId, index]);

  useEffect(() => {
    if (!compact || !trackRef.current) return;
    const row = trackRef.current.querySelector<HTMLElement>(`[data-wheel-index="${index}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [compact, index]);

  const visible = useMemo(() => {
    if (!filtered.length) return [];
    if (compact) {
      return filtered.map((song, absoluteIndex) => ({
        song,
        absoluteIndex,
        offset: absoluteIndex - index
      }));
    }

    const rows: { song: JukeboxSong; absoluteIndex: number; offset: number }[] = [];
    const start = Math.max(0, index - visibleRadius);
    const end = Math.min(filtered.length - 1, index + visibleRadius);
    for (let absoluteIndex = start; absoluteIndex <= end; absoluteIndex += 1) {
      rows.push({ song: filtered[absoluteIndex], absoluteIndex, offset: absoluteIndex - index });
    }
    return rows;
  }, [filtered, index, visibleRadius, compact]);

  function setSafeIndex(next: number) {
    if (!filtered.length) return;
    setIndex(Math.max(0, Math.min(filtered.length - 1, next)));
  }

  function move(delta: number) {
    setSafeIndex(index + delta);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (compact) return;
    if (Math.abs(event.deltaY) < 8) return;
    move(event.deltaY > 0 ? 1 : -1);
  }

  const selected = filtered[index];

  return (
    <div className={compact ? "jukebox-wheel compact" : "jukebox-wheel"}>
      {!compact && (
        <label className="wheel-search">
          <span>Search songs</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="title, artist, mood, genre..." />
        </label>
      )}
      <div className="wheel-controls">
        <button className="ghost" type="button" onClick={() => move(-1)}>▲</button>
        <button className="ghost" type="button" onClick={() => selected && void onPlay(selected)} disabled={!selected}>Play center</button>
        <button className="ghost" type="button" onClick={() => move(1)}>▼</button>
      </div>
      <div
        ref={trackRef}
        className={compact ? `wheel-track ${styles.pickerTrack}` : "wheel-track"}
        onWheel={handleWheel}
        role="listbox"
        aria-label="Jukebox song picker"
      >
        {!filtered.length && <p className="muted">No songs match this search.</p>}
        {visible.map(({ song, absoluteIndex, offset }) => {
          const count = plays[song.id] || 0;
          const isActive = absoluteIndex === index;
          const style = { "--wheel-offset": offset, "--wheel-distance": Math.abs(offset) } as CSSProperties;
          return (
            <button
              key={song.id}
              data-wheel-index={absoluteIndex}
              className={`${isActive ? "wheel-row active" : "wheel-row"}${compact ? ` ${styles.pickerRow}` : ""}`}
              style={style}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => {
                if (isActive) void onPlay(song);
                else {
                  setSafeIndex(absoluteIndex);
                  onSelect(song);
                }
              }}
            >
              <strong>{song.title}</strong>
              {!compact && <span>{song.artist || "George Grissom"} · {song.genre || "Live"}</span>}
              {!compact && <em>{catalogUnlocked ? "unlocked" : `${Math.max(0, song.freePlayLimit - count)} free plays left`}</em>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
