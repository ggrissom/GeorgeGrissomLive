"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

const CART_KEY = "gg_download_cart_v1";
const PURCHASED_KEY = "gg_purchased_song_slugs_v1";

function readJson<T>(key: string, fallback: T): T {
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

export default function CartSuccessPage() {
  const purchasedFromUrl = useMemo(() => {
    if (typeof window === "undefined") return [];
    const params = new URLSearchParams(window.location.search);
    return params.get("songs")?.split(",").filter(Boolean) ?? [];
  }, []);

  useEffect(() => {
    const existing = readJson<string[]>(PURCHASED_KEY, []);
    const merged = Array.from(new Set([...existing, ...purchasedFromUrl]));
    const remainingCart = readJson<Array<{ slug: string }>>(CART_KEY, []).filter(
      (item) => !merged.includes(item.slug)
    );

    writeJson(PURCHASED_KEY, merged);
    writeJson(CART_KEY, remainingCart);
  }, [purchasedFromUrl]);

  return (
    <main className="gg-page">
      <section className="gg-section gg-cart-page">
        <p className="gg-kicker">Paid</p>
        <h1>Downloads Unlocked</h1>
        <p>
          Your songs are ready. Head back to the jukebox and use the green download arrows whenever you want them.
        </p>
        <Link className="gg-button gg-button-primary" href="/">
          Back to Jukebox
        </Link>
      </section>
    </main>
  );
}
