"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";

import {
  createSpreads,
  paginateSongs,
  type PublicJukeboxSong,
} from "@/lib/jukebox";
import { SongCard } from "./song-card";

type JukeboxCatalogProps = {
  songs: PublicJukeboxSong[];
  selectedSongId?: string;
  open: boolean;
  onClose: () => void;
  onSelect: (song: PublicJukeboxSong) => void;
  openerRef?: RefObject<HTMLElement | null>;
};

export function JukeboxCatalog({
  songs,
  selectedSongId,
  open,
  onClose,
  onSelect,
  openerRef,
}: JukeboxCatalogProps) {
  const pages = useMemo(() => paginateSongs(songs), [songs]);
  const spreads = useMemo(() => createSpreads(pages), [pages]);
  const selectedPageIndex = useMemo(
    () => pages.findIndex((page) => page.some((song) => song.id === selectedSongId)),
    [pages, selectedSongId],
  );
  const selectedSpreadIndex =
    selectedPageIndex < 0 ? -1 : Math.floor(selectedPageIndex / 2);
  const maxSpreadIndex = Math.max(0, spreads.length - 1);
  const [spreadIndex, setSpreadIndex] = useState(() =>
    selectedSpreadIndex >= 0 ? selectedSpreadIndex : 0,
  );
  const selectedCardRef = useRef<HTMLButtonElement | null>(null);
  const firstCardRef = useRef<HTMLButtonElement | null>(null);
  const touchStartRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    setSpreadIndex((current) => {
      const requested =
        open && selectedSpreadIndex >= 0 ? selectedSpreadIndex : current;
      return Math.max(0, Math.min(requested, maxSpreadIndex));
    });
  }, [maxSpreadIndex, open, selectedSpreadIndex]);

  useEffect(() => {
    if (!open || songs.length === 0) return;

    const frame = window.requestAnimationFrame(() => {
      (selectedCardRef.current ?? firstCardRef.current)?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, spreadIndex, songs.length]);

  if (!open) return null;

  const spread = spreads[spreadIndex];

  function moveSpread(delta: number) {
    setSpreadIndex((current) =>
      Math.max(0, Math.min(maxSpreadIndex, current + delta)),
    );
  }

  function closeCatalog() {
    onClose();
    window.requestAnimationFrame(() => openerRef?.current?.focus());
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveSpread(-1);
        break;
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveSpread(1);
        break;
      case "Escape":
        event.preventDefault();
        closeCatalog();
        break;
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "touch") return;

    touchStartRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start || start.id !== event.pointerId) return;

    const horizontalDelta = event.clientX - start.x;
    const verticalDelta = event.clientY - start.y;
    const delta =
      Math.abs(horizontalDelta) >= Math.abs(verticalDelta)
        ? horizontalDelta
        : verticalDelta;

    if (Math.abs(delta) <= 40) return;
    moveSpread(delta < 0 ? 1 : -1);
  }

  const firstSongId = spread?.left[0]?.id ?? spread?.right?.[0]?.id;

  return (
    <section
      className="jukebox-catalog"
      role="dialog"
      aria-modal="true"
      aria-label="Jukebox song catalog"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        touchStartRef.current = null;
      }}
    >
      <header className="jukebox-catalog-header">
        <h2>Song catalog</h2>
        <button
          className="jukebox-catalog-close"
          type="button"
          onClick={closeCatalog}
        >
          Close catalog
        </button>
      </header>

      {spread ? (
        <div className="jukebox-catalog-spread" data-spread-index={spreadIndex}>
          <CatalogPage
            songs={spread.left}
            pageNumber={spreadIndex * 2 + 1}
            selectedSongId={selectedSongId}
            firstSongId={firstSongId}
            selectedCardRef={selectedCardRef}
            firstCardRef={firstCardRef}
            onSelect={onSelect}
          />
          {spread.right && (
            <CatalogPage
              songs={spread.right}
              pageNumber={spreadIndex * 2 + 2}
              selectedSongId={selectedSongId}
              firstSongId={firstSongId}
              selectedCardRef={selectedCardRef}
              firstCardRef={firstCardRef}
              onSelect={onSelect}
            />
          )}
        </div>
      ) : (
        <p className="jukebox-catalog-empty">No songs are available.</p>
      )}

      <footer className="jukebox-catalog-navigation">
        <button
          type="button"
          onClick={() => moveSpread(-1)}
          disabled={spreadIndex === 0}
          aria-label="Previous catalog spread"
        >
          Previous songs
        </button>
        <span aria-live="polite">
          {spreads.length ? `Spread ${spreadIndex + 1} of ${spreads.length}` : "No spreads"}
        </span>
        <button
          type="button"
          onClick={() => moveSpread(1)}
          disabled={spreadIndex >= maxSpreadIndex}
          aria-label="Next catalog spread"
        >
          Next songs
        </button>
      </footer>
    </section>
  );
}

function CatalogPage({
  songs,
  pageNumber,
  selectedSongId,
  firstSongId,
  selectedCardRef,
  firstCardRef,
  onSelect,
}: {
  songs: PublicJukeboxSong[];
  pageNumber: number;
  selectedSongId?: string;
  firstSongId?: string;
  selectedCardRef: RefObject<HTMLButtonElement | null>;
  firstCardRef: RefObject<HTMLButtonElement | null>;
  onSelect: (song: PublicJukeboxSong) => void;
}) {
  return (
    <section className="jukebox-catalog-page" aria-label={`Catalog page ${pageNumber}`}>
      {songs.map((song) => {
        const selected = song.id === selectedSongId;

        return (
          <SongCard
            key={song.id}
            song={song}
            selected={selected}
            onSelect={onSelect}
            buttonRef={selected ? selectedCardRef : song.id === firstSongId ? firstCardRef : undefined}
          />
        );
      })}
    </section>
  );
}
