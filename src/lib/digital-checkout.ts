import { digitalProductForSku } from "./digital-products";

export type DigitalCheckoutSpec = {
  sku: string;
  amountCents: number;
  paymentType: "song_download" | "digital_product";
  lineItems: Array<{ price: string; quantity: number }>;
  metadata: Record<string, string>;
};

export function buildDigitalCheckoutSpec(
  sku: string,
  visitorId: string,
  songId?: string | null
): DigitalCheckoutSpec | null {
  const product = digitalProductForSku(sku);
  if (!product || !product.enabled || !product.stripePriceId) return null;

  if (product.kind === "track") {
    if (!songId || !product.trackSlug) return null;
    return {
      sku: product.sku,
      amountCents: product.priceCents,
      paymentType: "song_download",
      lineItems: [{ price: product.stripePriceId, quantity: 1 }],
      metadata: {
        type: "song_download",
        visitorId,
        sku: product.sku,
        songId,
        songSlug: product.trackSlug
      }
    };
  }

  return {
    sku: product.sku,
    amountCents: product.priceCents,
    paymentType: "digital_product",
    lineItems: [{ price: product.stripePriceId, quantity: 1 }],
    metadata: {
      type: "digital_product",
      visitorId,
      sku: product.sku,
      productKind: product.kind
    }
  };
}
