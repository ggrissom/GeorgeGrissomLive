import test from "node:test";
import assert from "node:assert/strict";
import { buildDigitalCheckoutSpec } from "./digital-checkout";

test("track checkout uses only the server-owned Stripe price", () => {
  const spec = buildDigitalCheckoutSpec("track:what-a-shame", "visitor-123", "song-456");
  assert.ok(spec);
  assert.deepEqual(spec.lineItems, [{ price: "price_1UJY4vCxVbwtTLOGnsS5NbWx", quantity: 1 }]);
  assert.equal(spec.amountCents, 200);
  assert.equal(spec.paymentType, "song_download");
  assert.deepEqual(spec.metadata, {
    type: "song_download",
    visitorId: "visitor-123",
    sku: "track:what-a-shame",
    songId: "song-456",
    songSlug: "what-a-shame"
  });
});

test("album preorder is a fixed-price digital checkout with no immediate file entitlement", () => {
  const spec = buildDigitalCheckoutSpec("digital-album-preorder", "visitor-123");
  assert.ok(spec);
  assert.deepEqual(spec.lineItems, [{ price: "price_1UEdDFCxVbwtTLOGxblb7ZtT", quantity: 1 }]);
  assert.equal(spec.amountCents, 1500);
  assert.equal(spec.paymentType, "digital_product");
  assert.equal(spec.metadata.sku, "digital-album-preorder");
  assert.equal(spec.metadata.type, "digital_product");
});

test("disabled or unknown digital SKUs cannot create checkout", () => {
  assert.equal(buildDigitalCheckoutSpec("early-10-track-collection", "visitor-123"), null);
  assert.equal(buildDigitalCheckoutSpec("not-a-real-product", "visitor-123"), null);
});

test("track checkout requires a server-resolved song id", () => {
  assert.equal(buildDigitalCheckoutSpec("track:what-a-shame", "visitor-123"), null);
});
