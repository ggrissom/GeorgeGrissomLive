export type AudioCatalogEntry = {
  slug: string;
  title: string;
  album: string;
  durationSeconds: number;
  previewDriveFileId: string;
  fullDriveFileId: string;
  previewPath: string;
  fullPath: string;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
};

export const AUDIO_CATALOG = [
  {
    slug: "one-question",
    title: "One Question",
    album: "SINGLE",
    durationSeconds: 191.8,
    previewDriveFileId: "1wrJfeUUIFt9p82gGvJMjak-PX4AOxRjP",
    fullDriveFileId: "1r7oOGiQgoWqnAvHnlm2msOInZ78YnyOV",
    previewPath: "private/audio/mp3/previews/one-question-preview.mp3",
    fullPath: "private/audio/mp3/full/one-question.mp3",
    stripeProductId: null,
    stripePriceId: null
  },
  {
    slug: "what-a-shame",
    title: "What a Shame",
    album: "SINGLE",
    durationSeconds: 226.55,
    previewDriveFileId: "1iJZityhJaXkP3cRxXYni-Ss-c8i-lc5B",
    fullDriveFileId: "1j-jXKv8XWXjNSpM29ICqPRi_yItIGrk9",
    previewPath: "private/audio/mp3/previews/what-a-shame-preview.mp3",
    fullPath: "private/audio/mp3/full/what-a-shame.mp3",
    stripeProductId: null,
    stripePriceId: null
  },
  {
    slug: "this-song-is-about-you",
    title: "This Song Is About You",
    album: "SINGLE",
    durationSeconds: 221.425,
    previewDriveFileId: "1Zh1Z5Sa1hYXgXduAfWpLpgesxU2I4nRF",
    fullDriveFileId: "1d6PuYw4EnFQSz8PT5plQlnWN9SQkAlwm",
    previewPath: "private/audio/mp3/previews/this-song-is-about-you-preview.mp3",
    fullPath: "private/audio/mp3/full/this-song-is-about-you.mp3",
    stripeProductId: null,
    stripePriceId: null
  },
  {
    slug: "damnit-just-you-hold-on",
    title: "Damnit, Just You Hold On",
    album: "SINGLE",
    durationSeconds: 159.07,
    previewDriveFileId: "1phOuma1b3TPpoeomXgks5734c4bbHxNA",
    fullDriveFileId: "1He1tB4oYsn305S2B-OUIim2f6o3TOIcQ",
    previewPath: "private/audio/mp3/previews/damnit-just-you-hold-on-preview.mp3",
    fullPath: "private/audio/mp3/full/damnit-just-you-hold-on.mp3",
    stripeProductId: null,
    stripePriceId: null
  },
  {
    slug: "get-in-loser",
    title: "Get In Loser",
    album: "SINGLE",
    durationSeconds: 257.014,
    previewDriveFileId: "1slPcYTIKA0AYe5rgA0HypmTkhN8VI1aD",
    fullDriveFileId: "1hOvmSqNd8sJQKhKZnDYoSGzssP4rKpX-",
    previewPath: "private/audio/mp3/previews/get-in-loser-preview.mp3",
    fullPath: "private/audio/mp3/full/get-in-loser.mp3",
    stripeProductId: null,
    stripePriceId: null
  },
  {
    slug: "and-another-thing-screams",
    title: "And Another Thing",
    album: "SINGLE",
    durationSeconds: 189.398,
    previewDriveFileId: "1pa9gMR4WN6FVHFNfKmXCFcYBiSomjccM",
    fullDriveFileId: "1Op07qVypypgnrBT1XcxzDk3Tjqy6uyd0",
    previewPath: "private/audio/mp3/previews/and-another-thing-screams-preview.mp3",
    fullPath: "private/audio/mp3/full/and-another-thing-screams.mp3",
    stripeProductId: null,
    stripePriceId: null
  },
  {
    slug: "nose-to-the-grindstone",
    title: "Nose to the Grindstone",
    album: "A Taste For Crow",
    durationSeconds: 177.951,
    previewDriveFileId: "1WigtdhuZviKYi-7ExH_D_Gvj-7bb0xAz",
    fullDriveFileId: "1A5suXnpT6tO-cB_DxGvfpRtbVV3nPnDa",
    previewPath: "private/audio/mp3/previews/nose-to-the-grindstone-preview.mp3",
    fullPath: "private/audio/mp3/full/nose-to-the-grindstone.mp3",
    stripeProductId: null,
    stripePriceId: null
  }
] satisfies AudioCatalogEntry[];

export function audioAssetForSlug(slug: string | null | undefined) {
  if (!slug) return null;
  return AUDIO_CATALOG.find(entry => entry.slug === slug) || null;
}
