export type DigitalProductKind = "track" | "preorder" | "collection";

export type DigitalProduct = {
  sku: string;
  kind: DigitalProductKind;
  title: string;
  priceCents: number;
  stripeProductId: string;
  stripePriceId: string;
  stripePaymentLinkUrl: string;
  enabled: boolean;
  immediateDownload: boolean;
  deliveryFormat: "wav" | "future";
  trackSlug: string;
  wavDriveFileId: string;
  wavBlobPathname: string;
  wavFileName: string;
  disabledReason: string;
};

const TRACK_PRODUCTS: DigitalProduct[] = [
  {
    sku: "track:one-question",
    kind: "track",
    title: "One Question",
    priceCents: 200,
    stripeProductId: "prod_VKCUnF7fKbfydP",
    stripePriceId: "price_1UJY55CxVbwtTLOGCng907OW",
    stripePaymentLinkUrl: "https://buy.stripe.com/00wdR8cFscc78HC4Rw5ZC02",
    enabled: true,
    immediateDownload: true,
    deliveryFormat: "wav",
    trackSlug: "one-question",
    wavDriveFileId: "1xkA0JahBpeHgI2OdMM2yOtrP0ZNxoa9G",
    wavBlobPathname: "paid-audio/one-question.wav",
    wavFileName: "George Grissom - One Question.wav",
    disabledReason: ""
  },
  {
    sku: "track:what-a-shame",
    kind: "track",
    title: "What a Shame",
    priceCents: 200,
    stripeProductId: "prod_VKCT7GayLlQkNF",
    stripePriceId: "price_1UJY4vCxVbwtTLOGnsS5NbWx",
    stripePaymentLinkUrl: "https://buy.stripe.com/fZueVc0WKekf2je83I5ZC03",
    enabled: true,
    immediateDownload: true,
    deliveryFormat: "wav",
    trackSlug: "what-a-shame",
    wavDriveFileId: "1SstUXGr0C78uiavltys6X-c6HdaAHjIi",
    wavBlobPathname: "paid-audio/what-a-shame.wav",
    wavFileName: "George Grissom - What a Shame.wav",
    disabledReason: ""
  },
  {
    sku: "track:this-song-is-about-you",
    kind: "track",
    title: "This Song Is About You",
    priceCents: 200,
    stripeProductId: "prod_VKCUeBj0RxGrMG",
    stripePriceId: "price_1UJY57CxVbwtTLOG5Yhbu1XJ",
    stripePaymentLinkUrl: "https://buy.stripe.com/8x2dR848Wa3Zga46ZE5ZC04",
    enabled: true,
    immediateDownload: true,
    deliveryFormat: "wav",
    trackSlug: "this-song-is-about-you",
    wavDriveFileId: "1vcR2UAbrINKXKx6e_iLDGw5M8V205eAg",
    wavBlobPathname: "paid-audio/this-song-is-about-you.wav",
    wavFileName: "George Grissom - This Song Is About You.wav",
    disabledReason: ""
  },
  {
    sku: "track:damnit-just-you-hold-on",
    kind: "track",
    title: "Damnit, Just You Hold On",
    priceCents: 200,
    stripeProductId: "prod_VKCU1pO4kplwGC",
    stripePriceId: "price_1UJY59CxVbwtTLOGsG8RNipa",
    stripePaymentLinkUrl: "https://buy.stripe.com/eVq14mbBocc7cXS6ZE5ZC05",
    enabled: true,
    immediateDownload: true,
    deliveryFormat: "wav",
    trackSlug: "damnit-just-you-hold-on",
    wavDriveFileId: "15agxRsQKtQr34voMnSFcY-NvMxCI1G0c",
    wavBlobPathname: "paid-audio/damnit-just-you-hold-on.wav",
    wavFileName: "George Grissom - Damnit, Just You Hold On.wav",
    disabledReason: ""
  },
  {
    sku: "track:get-in-loser",
    kind: "track",
    title: "Get In Loser",
    priceCents: 200,
    stripeProductId: "prod_VKCUEpylyIAFva",
    stripePriceId: "price_1UJY5ACxVbwtTLOGOQekJQfB",
    stripePaymentLinkUrl: "https://buy.stripe.com/dRm28qcFs1xt1fa0Bg5ZC06",
    enabled: true,
    immediateDownload: true,
    deliveryFormat: "wav",
    trackSlug: "get-in-loser",
    wavDriveFileId: "1pYUGFF8O5QtQE-yy69BjVRYv-fXnYJdx",
    wavBlobPathname: "paid-audio/get-in-loser.wav",
    wavFileName: "George Grissom - Get In Loser.wav",
    disabledReason: ""
  },
  {
    sku: "track:and-another-thing-screams",
    kind: "track",
    title: "And Another Thing",
    priceCents: 200,
    stripeProductId: "prod_VKCUfQeTnTeHoF",
    stripePriceId: "price_1UJY5CCxVbwtTLOGCQ4jvIZu",
    stripePaymentLinkUrl: "https://buy.stripe.com/5kQfZggVIekf4rmabQ5ZC07",
    enabled: true,
    immediateDownload: true,
    deliveryFormat: "wav",
    trackSlug: "and-another-thing-screams",
    wavDriveFileId: "1VoqqTsoTGvb4Jozdj7sU7kjKXe-69qvT",
    wavBlobPathname: "paid-audio/and-another-thing-screams.wav",
    wavFileName: "George Grissom - And Another Thing.wav",
    disabledReason: ""
  },
  {
    sku: "track:nose-to-the-grindstone",
    kind: "track",
    title: "Nose to the Grindstone",
    priceCents: 200,
    stripeProductId: "prod_VKCUT0LM0vXkuc",
    stripePriceId: "price_1UJY5ECxVbwtTLOG0Gd54KSu",
    stripePaymentLinkUrl: "https://buy.stripe.com/6oU6oGaxkekf4rm3Ns5ZC08",
    enabled: true,
    immediateDownload: true,
    deliveryFormat: "wav",
    trackSlug: "nose-to-the-grindstone",
    wavDriveFileId: "1c4SPN_b9wMeE5PsaMPF7JixefdMRb1oh",
    wavBlobPathname: "paid-audio/nose-to-the-grindstone.wav",
    wavFileName: "George Grissom - Nose to the Grindstone.wav",
    disabledReason: ""
  }
];

export const DIGITAL_PRODUCTS: DigitalProduct[] = [
  ...TRACK_PRODUCTS,
  {
    sku: "digital-album-preorder",
    kind: "preorder",
    title: "Digital Album Pre-Order",
    priceCents: 1500,
    stripeProductId: "prod_VF7STpJ0JYNOy4",
    stripePriceId: "price_1UEdDFCxVbwtTLOGxblb7ZtT",
    stripePaymentLinkUrl: "https://buy.stripe.com/00w4gy8pc2Bx8HC83I5ZC09",
    enabled: true,
    immediateDownload: false,
    deliveryFormat: "future",
    trackSlug: "",
    wavDriveFileId: "",
    wavBlobPathname: "",
    wavFileName: "",
    disabledReason: ""
  },
  {
    sku: "early-10-track-collection",
    kind: "collection",
    title: "Pre-Recording Collection – All 10 Early Tracks",
    priceCents: 1500,
    stripeProductId: "prod_VF7SlLkhhZDDua",
    stripePriceId: "price_1UEdDACxVbwtTLOG0cKEmceK",
    stripePaymentLinkUrl: "",
    enabled: false,
    immediateDownload: true,
    deliveryFormat: "wav",
    trackSlug: "",
    wavDriveFileId: "",
    wavBlobPathname: "",
    wavFileName: "",
    disabledReason: "Awaiting approved 10-track WAV master list"
  }
];

export function purchasableTrackForSlug(slug: string | null | undefined) {
  if (!slug) return null;
  return TRACK_PRODUCTS.find(product => product.trackSlug === slug && product.enabled) || null;
}

export function digitalProductForSku(sku: string | null | undefined) {
  if (!sku) return null;
  return DIGITAL_PRODUCTS.find(product => product.sku === sku) || null;
}
