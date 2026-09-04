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

export type JukeboxSong = {
  id: string;
  title: string;
  artist?: string | null;
  genre?: string | null;
  mood?: string | null;
  tempoLabel?: string | null;
  audioUrl?: string | null;
  minTipCents?: number;
  freePlayLimit: number;
};

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
  onPlay: (song: JukeboxSong) => void;
  audioRef: RefObject<HTMLAudioElement | null>;
}) {
  return (
    <div className="reference-jukebox-module">
      <div className="reference-jukebox">
        <img
          className="reference-jukebox-photo"
          src="/images/reference-jukebox.png"
          alt="Classic chrome and glass jukebox"
          draggable={false}
        />

        <div className="reference-jukebox-now" aria-live="polite">
          <span>NOW PLAYING</span>
          <NowPlayingTitle title={currentSong?.title || "Pick a song"} />
          <small>{currentSong?.artist || "George Grissom"}</small>
        </div>

        <div className="reference-jukebox-wheel-window">
          <JukeboxSongWheel
            songs={songs}
            plays={plays}
            catalogUnlocked={catalogUnlocked}
            selectedSongId={selectedSongId}
            onSelect={onSelect}
            onPlay={onPlay}
            visibleRadius={3}
            compact
          />
        </div>

        <div className="reference-jukebox-credit">
          {catalogUnlocked ? "∞ CREDITS" : "2 FREE SPINS"}
        </div>
      </div>

      <audio ref={audioRef} controls className="audio reference-audio" />
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
  onPlay: (song: JukeboxSong) => void;
  visibleRadius?: number;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

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

  const visible = useMemo(() => {
    if (!filtered.length) return [];
    const rows: { song: JukeboxSong; absoluteIndex: number; offset: number }[] = [];
    const start = Math.max(0, index - visibleRadius);
    const end = Math.min(filtered.length - 1, index + visibleRadius);
    for (let absoluteIndex = start; absoluteIndex <= end; absoluteIndex += 1) {
      rows.push({ song: filtered[absoluteIndex], absoluteIndex, offset: absoluteIndex - index });
    }
    return rows;
  }, [filtered, index, visibleRadius]);

  function setSafeIndex(next: number) {
    if (!filtered.length) return;
    setIndex(Math.max(0, Math.min(filtered.length - 1, next)));
  }

  function move(delta: number) {
    setSafeIndex(index + delta);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
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
        <button className="ghost" type="button" onClick={() => selected && onPlay(selected)} disabled={!selected}>Play center</button>
        <button className="ghost" type="button" onClick={() => move(1)}>▼</button>
      </div>
      <div className="wheel-track" onWheel={handleWheel} role="listbox" aria-label="Jukebox song wheel">
        {!filtered.length && <p className="muted">No songs match this search.</p>}
        {visible.map(({ song, absoluteIndex, offset }) => {
          const count = plays[song.id] || 0;
          const isActive = absoluteIndex === index;
          const style = { "--wheel-offset": offset, "--wheel-distance": Math.abs(offset) } as CSSProperties;
          return (
            <button
              key={song.id}
              className={isActive ? "wheel-row active" : "wheel-row"}
              style={style}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => {
                if (isActive) onPlay(song);
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
