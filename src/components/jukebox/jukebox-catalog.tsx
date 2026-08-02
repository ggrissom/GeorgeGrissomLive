"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";

import {
  createSpreads,
  paginateSongs,
  type PublicJukeboxSong,
} from "@/lib/jukebox";
import {
  clampCatalogPage,
  closeCatalogAndRestoreFocus,
  getTouchPageGesture,
  selectCatalogSong,
} from "./jukebox-catalog-navigation";
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
  const maxPageIndex = Math.max(0, pages.length - 1);
  const [pageIndex, setPageIndex] = useState(() =>
    selectedPageIndex >= 0 ? selectedPageIndex : 0,
  );
  const selectedCardRef = useRef<HTMLButtonElement>(null);
  const firstCardRef = useRef<HTMLButtonElement>(null);
  const catalogRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setPageIndex((current) => {
      const requested =
        open && selectedPageIndex >= 0 ? selectedPageIndex : current;
      return clampCatalogPage(requested, 0, pages.length);
    });
  }, [open, pages.length, selectedPageIndex]);

  useEffect(() => {
    if (!open || songs.length === 0) return;

    const frame = window.requestAnimationFrame(() => {
      (selectedCardRef.current ?? firstCardRef.current)?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, pageIndex, songs.length]);

  useEffect(
    () => () => {
      if (suppressClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressClickTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (catalogRef.current) {
      catalogRef.current.inert = !open;
    }
  }, [open]);

  const leftPage = pages[pageIndex];
  const rightPage = pages[pageIndex + 1];

  function movePage(delta: number) {
    setPageIndex((current) => clampCatalogPage(current, delta, pages.length));
  }

  function moveSpread(delta: number) {
    movePage(delta * 2);
  }

  function closeCatalog() {
    closeCatalogAndRestoreFocus(
      onClose,
      openerRef,
      (callback) => window.requestAnimationFrame(callback),
    );
  }

  function suppressFollowingClick() {
    suppressClickRef.current = true;

    if (suppressClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressClickTimeoutRef.current);
    }

    suppressClickTimeoutRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimeoutRef.current = null;
    }, 500);
  }

  function releasePointer(event: PointerEvent<HTMLElement>) {
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Some browsers can release capture before the synthetic event completes.
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        moveSpread(-1);
        break;
      case "ArrowRight":
        event.preventDefault();
        moveSpread(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        movePage(-1);
        break;
      case "ArrowDown":
        event.preventDefault();
        movePage(1);
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

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is unavailable for some synthetic touch events.
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    releasePointer(event);

    if (!start || start.id !== event.pointerId) return;

    const gesture = getTouchPageGesture(start, {
      x: event.clientX,
      y: event.clientY,
    });

    if (!gesture.suppressClick) return;

    suppressFollowingClick();
    movePage(gesture.pageDelta);
  }

  function handlePointerCancel(event: PointerEvent<HTMLElement>) {
    touchStartRef.current = null;
    releasePointer(event);
  }

  function handleClickCapture(event: MouseEvent<HTMLElement>) {
    if (!suppressClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;

    if (suppressClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressClickTimeoutRef.current);
      suppressClickTimeoutRef.current = null;
    }
  }

  const firstSongId = leftPage?.[0]?.id ?? rightPage?.[0]?.id;

  return (
    <section
      ref={catalogRef}
      className={open ? "jukebox-catalog is-open" : "jukebox-catalog is-closed"}
      role="dialog"
      aria-modal={open ? "true" : undefined}
      aria-hidden={!open}
      aria-label="Jukebox song catalog"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
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

      {leftPage ? (
        <div className="jukebox-catalog-spread" data-page-index={pageIndex}>
          <CatalogPage
            songs={leftPage}
            pageNumber={pageIndex + 1}
            selectedSongId={selectedSongId}
            firstSongId={firstSongId}
            selectedCardRef={selectedCardRef}
            firstCardRef={firstCardRef}
            onSelect={(song) => selectCatalogSong(song, onSelect, closeCatalog)}
          />
          {rightPage && (
            <CatalogPage
              songs={rightPage}
              pageNumber={pageIndex + 2}
              selectedSongId={selectedSongId}
              firstSongId={firstSongId}
              selectedCardRef={selectedCardRef}
              firstCardRef={firstCardRef}
              onSelect={(song) => selectCatalogSong(song, onSelect, closeCatalog)}
            />
          )}
        </div>
      ) : (
        <p className="jukebox-catalog-empty">No songs are available.</p>
      )}

      <footer className="jukebox-catalog-navigation jukebox-catalog-navigation-desktop">
        <button
          type="button"
          onClick={() => moveSpread(-1)}
          disabled={pageIndex === 0}
          aria-label="Previous catalog spread"
        >
          Previous songs
        </button>
        <span aria-live="polite">
          {pages.length
            ? `Page ${pageIndex + 1} of ${pages.length} · spread ${Math.floor(pageIndex / 2) + 1} of ${spreads.length}`
            : "No spreads"}
        </span>
        <button
          type="button"
          onClick={() => moveSpread(1)}
          disabled={pageIndex >= maxPageIndex}
          aria-label="Next catalog spread"
        >
          Next songs
        </button>
      </footer>

      <footer className="jukebox-catalog-navigation jukebox-catalog-navigation-mobile">
        <button
          type="button"
          onClick={() => movePage(-1)}
          disabled={pageIndex === 0}
          aria-label="Previous catalog page"
        >
          Previous page
        </button>
        <span aria-live="polite">
          {pages.length ? `Page ${pageIndex + 1} of ${pages.length}` : "No pages"}
        </span>
        <button
          type="button"
          onClick={() => movePage(1)}
          disabled={pageIndex >= maxPageIndex}
          aria-label="Next catalog page"
        >
          Next page
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
  selectedCardRef: RefObject<HTMLButtonElement>;
  firstCardRef: RefObject<HTMLButtonElement>;
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
