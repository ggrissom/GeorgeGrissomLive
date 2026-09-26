import test from "node:test";
import assert from "node:assert/strict";
import {
  DIGITAL_PRODUCTS,
  purchasableTrackForSlug,
  digitalProductForSku
} from "./digital-products";

const sellableTrackSlugs = [
  "one-question",
  "what-a-shame",
  "this-song-is-about-you",
  "damnit-just-you-hold-on",
  "get-in-loser",
  "and-another-thing-screams",
  "nose-to-the-grindstone"
];

test("every sellable single resolves to a canonical WAV and server-owned Stripe price", () => {
  for (const slug of sellableTrackSlugs) {
    const product = purchasableTrackForSlug(slug);
    assert.ok(product, `missing product for ${slug}`);
    assert.equal(product.kind, "track");
    assert.equal(product.deliveryFormat, "wav");
    assert.match(product.wavDriveFileId, /^[A-Za-z0-9_-]{20,}$/);
    assert.match(product.stripePriceId, /^price_/);
    assert.equal(product.priceCents, 200);
  }
});

test("digital album preorder is purchasable but does not grant an immediate file", () => {
  const product = digitalProductForSku("digital-album-preorder");
  assert.ok(product);
  assert.equal(product.kind, "preorder");
  assert.equal(product.priceCents, 1500);
  assert.equal(product.immediateDownload, false);
  assert.match(product.stripePriceId, /^price_/);
});

test("the ten-track early collection remains unavailable until ten approved masters are mapped", () => {
  const product = digitalProductForSku("early-10-track-collection");
  assert.ok(product);
  assert.equal(product.kind, "collection");
  assert.equal(product.enabled, false);
  assert.equal(product.disabledReason, "Awaiting approved 10-track WAV master list");
});

test("catalog contains no enabled digital product without a Stripe price", () => {
  for (const product of DIGITAL_PRODUCTS) {
    if (!product.enabled) continue;
    assert.match(product.stripePriceId, /^price_/);
  }
});
