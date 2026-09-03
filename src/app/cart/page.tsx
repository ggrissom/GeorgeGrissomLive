"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CartItem = {
  slug: string;
  title: string;
  src: string;
  priceCents: number;
};

const CART_KEY = "gg_download_cart_v1";

function readCart() {
  try {
    const value = window.localStorage.getItem(CART_KEY);
    return value ? (JSON.parse(value) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [error, setError] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    setItems(readCart());
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.priceCents, 0),
    [items]
  );

  function removeItem(slug: string) {
    const nextItems = items.filter((item) => item.slug !== slug);
    setItems(nextItems);
    writeCart(nextItems);
  }

  async function checkout() {
    setError("");
    setIsCheckingOut(true);

    try {
      const response = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Checkout could not start.");
      }

      window.location.href = data.checkoutUrl;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed.");
      setIsCheckingOut(false);
    }
  }

  return (
    <main className="gg-page">
      <section className="gg-section gg-cart-page">
        <p className="gg-kicker">Cart</p>
        <h1>Song Downloads</h1>

        {items.length === 0 ? (
          <>
            <p className="gg-empty">Your cart is empty.</p>
            <Link className="gg-button gg-button-primary" href="/">
              Back to Jukebox
            </Link>
          </>
        ) : (
          <>
            <div className="gg-cart-items">
              {items.map((item) => (
                <article className="gg-cart-item" key={item.slug}>
                  <div>
                    <h2>{item.title}</h2>
                    <p>$2 download</p>
                  </div>
                  <button type="button" onClick={() => removeItem(item.slug)}>
                    Remove
                  </button>
                </article>
              ))}
            </div>

            <div className="gg-cart-total">
              <span>Total</span>
              <strong>${(total / 100).toFixed(2)}</strong>
            </div>

            {error ? <p className="gg-error">{error}</p> : null}

            <button className="gg-button gg-button-primary" type="button" onClick={checkout} disabled={isCheckingOut}>
              {isCheckingOut ? "Opening Stripe…" : "Checkout with Stripe"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
