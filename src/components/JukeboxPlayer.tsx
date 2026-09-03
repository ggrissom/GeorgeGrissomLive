"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type SongForJukebox = {
  slug: string;
  title: string;
  src: string;
  priceCents: number;
};

type CartItem = {
  slug: string;
  title: string;
  src: string;
  priceCents: number;
};

const FREE_PLAY_LIMIT = 3;
const FREE_PLAYS_KEY = "gg_free_plays_by_song_v1";
const CART_KEY = "gg_download_cart_v1";
const PURCHASED_KEY = "gg_purchased_song_slugs_v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function currency(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export function JukeboxPlayer({ songs }: { songs: SongForJukebox[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSlug, setCurrentSlug] = useState(songs[0]?.slug ?? "");
  const [playsLeft, setPlaysLeft] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchased, setPurchased] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  const currentSong = useMemo(
    () => songs.find((song) => song.slug === currentSlug) ?? songs[0],
    [songs, currentSlug]
  );

  useEffect(() => {
    const storedPlays = readJson<Record<string, number>>(FREE_PLAYS_KEY, {});
    const nextPlays = { ...storedPlays };

    for (const song of songs) {
      if (typeof nextPlays[song.slug] !== "number") {
        nextPlays[song.slug] = FREE_PLAY_LIMIT;
      }
    }

    setPlaysLeft(nextPlays);
    setCart(readJson<CartItem[]>(CART_KEY, []));
    setPurchased(readJson<string[]>(PURCHASED_KEY, []));
    writeJson(FREE_PLAYS_KEY, nextPlays);
    setIsReady(true);
  }, [songs]);

  const cartCount = cart.length;

  function persistCart(nextCart: CartItem[]) {
    setCart(nextCart);
    writeJson(CART_KEY, nextCart);
  }

  function addToCart(song: SongForJukebox) {
    const nextCart = cart.some((item) => item.slug === song.slug)
      ? cart
      : [...cart, song];

    persistCart(nextCart);
  }

  async function playSong(song: SongForJukebox) {
    setCurrentSlug(song.slug);

    const isPurchased = purchased.includes(song.slug);
    const remaining = playsLeft[song.slug] ?? FREE_PLAY_LIMIT;

    if (!isPurchased && remaining <= 0) {
      addToCart(song);
      return;
    }

    if (!isPurchased) {
      const nextPlays = {
        ...playsLeft,
        [song.slug]: Math.max(0, remaining - 1),
      };

      setPlaysLeft(nextPlays);
      writeJson(FREE_PLAYS_KEY, nextPlays);
    }

    if (audioRef.current) {
      audioRef.current.src = song.src;
      await audioRef.current.play().catch(() => undefined);
    }
  }

  function handleDownloadClick(song: SongForJukebox) {
    if (purchased.includes(song.slug)) return;
    addToCart(song);
  }

  function freePlayText(song: SongForJukebox) {
    if (purchased.includes(song.slug)) return "Purchased";
    const remaining = playsLeft[song.slug] ?? FREE_PLAY_LIMIT;
    return remaining > 0 ? `Free Plays Left: ${remaining}` : "$2 Download";
  }

  if (!songs.length) {
    return (
      <div className="gg-jukebox-shell">
        <p className="gg-empty">Upload songs to public/audio and they will show in the jukebox.</p>
      </div>
    );
  }

  return (
    <div className="gg-jukebox-shell">
      <div className="gg-cart-bar">
        <Link className={`gg-cart-link ${cartCount > 0 ? "is-hot" : ""}`} href="/cart">
          🛒 <span>Cart</span> <strong>{cartCount}</strong>
        </Link>
      </div>

      <div className="gg-jukebox">
        <img className="gg-jukebox-image" src="/images/reference-jukebox.png" alt="George Grissom jukebox song player" />

        <div className="gg-jukebox-now">
          <p>Now Playing</p>
          <h2>{currentSong?.title ?? "Select A Song"}</h2>
          <div className="gg-jukebox-rule">———*———</div>
          <span>{currentSong ? freePlayText(currentSong) : "Free Plays Left: 3"}</span>
        </div>

        <div className="gg-jukebox-list">
          {songs.map((song) => {
            const isCurrent = song.slug === currentSong?.slug;
            const isPurchased = purchased.includes(song.slug);
            const remaining = playsLeft[song.slug] ?? FREE_PLAY_LIMIT;
            const needsPurchase = !isPurchased && remaining <= 0;

            return (
              <article className={`gg-song-row ${isCurrent ? "is-current" : ""}`} key={song.slug}>
                <button type="button" onClick={() => playSong(song)}>
                  <span>{song.title}</span>
                  <small>{isPurchased ? "Unlocked" : needsPurchase ? "$2 Download" : `${remaining} free left`}</small>
                </button>

                {isPurchased ? (
                  <a className="gg-download-icon is-owned" href={song.src} download aria-label={`Download ${song.title}`}>
                    ⬇
                  </a>
                ) : (
                  <button
                    className={`gg-download-icon ${needsPurchase ? "is-required" : ""}`}
                    type="button"
                    onClick={() => handleDownloadClick(song)}
                    aria-label={`Add ${song.title} download to cart`}
                  >
                    ⬇ <span>{currency(song.priceCents)}</span>
                  </button>
                )}
              </article>
            );
          })}
        </div>

        <audio ref={audioRef} controls preload="metadata" className="gg-audio" />
      </div>

      {!isReady ? <p className="gg-empty">Loading jukebox…</p> : null}
    </div>
  );
}
