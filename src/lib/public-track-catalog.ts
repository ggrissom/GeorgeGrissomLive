export const PLAYER_SEASONS = [
  "Counterfist Archive",
  "From the Setlist",
  "A Taste For Crow"
] as const;

export type PlayerSeason = typeof PLAYER_SEASONS[number];
export type PlayerSeasonOrUnsorted = PlayerSeason | "Unsorted";

export type PublicTrackSeed = {
  slug: string;
  title: string;
  fileId: string;
  seasons: PlayerSeason[];
  defaultPublic: boolean;
  hostedFileName?: string | null;
  artist?: string;
  aliases?: string[];
};

export const NAMECHEAP_AUDIO_BASE_URL =
  process.env.AUDIO_BASE_URL || "https://assets.georgegrissom.com/mp3";

export const PUBLIC_TRACKS: PublicTrackSeed[] = [
  {
    slug: "one-question",
    title: "One Question",
    fileId: "1r7oOGiQgoWqnAvHnlm2msOInZ78YnyOV",
    seasons: ["From the Setlist", "A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "01 - One Question.mp3"
  },
  {
    slug: "the-seed",
    title: "The Seed",
    fileId: "1RHi7udbWPy258fO_0Xnf1vBJq9NEINSM",
    seasons: ["From the Setlist"],
    defaultPublic: true,
    hostedFileName: "02 - The Seed.mp3"
  },
  {
    slug: "white-house-road",
    title: "White House Road",
    fileId: "1xZyobHpKTdIx7VuqC1QlJf8EJ-FPygM9",
    seasons: ["From the Setlist", "A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "03 - White House Road.mp3"
  },
  {
    slug: "what-a-shame",
    title: "What a Shame",
    fileId: "1j-jXKv8XWXjNSpM29ICqPRi_yItIGrk9",
    seasons: ["From the Setlist"],
    defaultPublic: true,
    hostedFileName: "04 - What a Shame.mp3"
  },
  {
    slug: "nose-to-the-grindstone",
    title: "Nose to the Grindstone",
    fileId: "1A5suXnpT6tO-cB_DxGvfpRtbVV3nPnDa",
    seasons: ["From the Setlist"],
    defaultPublic: true,
    hostedFileName: "05 - Nose to the Grindstone.mp3"
  },
  {
    slug: "who-did-that-to-you",
    title: "Who did that to you?",
    fileId: "1AW6RI5Rhgql5wLdho6e3-acR5mml66lp",
    seasons: ["From the Setlist"],
    defaultPublic: true,
    hostedFileName: "06 - Who did that to you.mp3",
    aliases: ["Who Did That To You", "Who Did That To You?"]
  },
  {
    slug: "evangelina",
    title: "Evangelina",
    fileId: "1f0BbrQ5-3_QxYmaPeTQ7Q8o-ypg2yJ6d",
    seasons: ["From the Setlist"],
    defaultPublic: true,
    hostedFileName: "07 - Evangelina.mp3"
  },
  {
    slug: "old-macdonald",
    title: "Old MacDonald",
    fileId: "1-5YSK37jjkcJNt4qWfPD-Gn5FQfvu9VX",
    seasons: ["From the Setlist", "A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "08 - Old MacDonald.mp3"
  },

  {
    slug: "get-in-loser",
    title: "Get In Loser",
    fileId: "1hOvmSqNd8sJQKhKZnDYoSGzssP4rKpX-",
    seasons: ["A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "01 - Get In Loser.mp3"
  },
  {
    slug: "and-another-thing",
    title: "...And another thing",
    fileId: "1Op07qVypypgnrBT1XcxzDk3Tjqy6uyd0",
    seasons: ["A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "02 - ...And another thing.mp3",
    aliases: ["And Another Thing", "And another thing"]
  },
  {
    slug: "need-the-cage",
    title: "Need the Cage",
    fileId: "1OYraGiCjd-Ovwe10-cM7swZoCZJLJWHY",
    seasons: ["A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "03 - Need the Cage.mp3"
  },
  {
    slug: "damnit-just-you-hold-on",
    title: "Damnit, just you hold on",
    fileId: "1He1tB4oYsn305S2B-OUIim2f6o3TOIcQ",
    seasons: ["A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "04 - Damnit, just you hold on.mp3",
    aliases: ["Damnit, Just You Hold On"]
  },
  {
    slug: "lahar",
    title: "Lahar",
    fileId: "1Lc1L_1oquHP4EGAJIq22OvJYLcjeMGU5",
    seasons: ["A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "05 - Lahar.mp3"
  },
  {
    slug: "this-song-is-about-you",
    title: "This song is about you.",
    fileId: "1d6PuYw4EnFQSz8PT5plQlnWN9SQkAlwm",
    seasons: ["A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "06 - This song is about you.mp3",
    aliases: ["This Song Is About You", "This song is about you"]
  },
  {
    slug: "light-under-the-moon",
    title: "Own Light Under The Moon",
    fileId: "1vIyRrCgdl1aS7hxnEGsnAy96vINYFKGR",
    seasons: ["A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "07 - Own Light Under The Moon.mp3",
    aliases: ["Light Under the Moon"]
  },
  {
    slug: "toyota-4",
    title: "Introducing, The All New Toyota Get Some",
    fileId: "1k-BZzxJBz0vc1BNf_ST6cevVtnx1Pxxo",
    seasons: ["A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "08 - Introducing, The All New Toyota Get Some.mp3",
    aliases: ["Toyota 4", "Introducing the All new Toyota Foreplay"]
  },
  {
    slug: "grass-before-the-sickle",
    title: "Grass Before the Sickle (ongoing concern)",
    fileId: "1YM4SuqZTADyAiZdDSzMdypUmaNzUzwyy",
    seasons: ["A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "09 - Grass Before the Sickle (ongoing concern).mp3",
    aliases: ["Grass Before the Sickle"]
  },
  {
    slug: "medieval",
    title: "Medieval",
    fileId: "1DrEGN6rSOzgniKlM5sr4pvNW72RulJC3",
    seasons: ["A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "10 - Medieval.mp3"
  },
  {
    slug: "dumb-dumb",
    title: "Dumb Dumb",
    fileId: "1DFefc7kToTX1sIgCQjJdN8vgsawZ2Efg",
    seasons: ["A Taste For Crow"],
    defaultPublic: true,
    hostedFileName: "12 - Dumb Dumb.mp3"
  },

  {
    slug: "counterfist-prison-cell-remaster",
    title: "Prison Cell — Remaster",
    fileId: "1Uh6llVVwkMqjEVhl2jnMOyjgMBGQcZzz",
    seasons: ["Counterfist Archive"],
    defaultPublic: true,
    artist: "Counterfist",
    aliases: ["counterfist prison-cell Re-re-mass-turd"]
  },
  {
    slug: "counterfist-prison-cell",
    title: "Prison Cell",
    fileId: "1R8XRipjFknzhjpwxgD6sMu0Y_kVR_AFG",
    seasons: ["Counterfist Archive"],
    defaultPublic: true,
    artist: "Counterfist",
    aliases: ["counterfist-prison-cell"]
  },
  {
    slug: "counterfist-raivival-sound-wreck",
    title: "Counterfist Ra.i.vival Covers — Sound Wreck",
    fileId: "1X5LYvZzHz_4DP97nj7Ky71I-LNfCkKL0",
    seasons: ["Counterfist Archive"],
    defaultPublic: true,
    artist: "Counterfist",
    aliases: ["Counterfist Ra.i.vival Covers - Sound Wreck"]
  },

  { slug: "toyota-2", title: "Toyota 2", fileId: "1gXYo21QGlsfUh6o64YVdHog6Qh-veR96", seasons: [], defaultPublic: false },
  { slug: "this-is-about-you", title: "This is about you, this song. It's about you.", fileId: "11aeRjsefHndZdkKXBoR7patn6eRVUamF", seasons: [], defaultPublic: false },
  { slug: "this-boy-this-girl", title: "This Boy, This Girl", fileId: "1L2YZCex0MRGkGSf8HvNbaIG1dtf9WN-e", seasons: [], defaultPublic: false },
  { slug: "this-boy-this-girl-allay", title: "This Boy, This Girl, Allay", fileId: "1Zd5HfnhpbfX0JV9JIgor3LjJ0GdiCxg9", seasons: [], defaultPublic: false },
  { slug: "one-question-boy-this-is-girl", title: "One Question — Boy, this is girl", fileId: "1PGDelNbXCiv5tU-GqXCmB4tirqYQL07b", seasons: [], defaultPublic: false },
  { slug: "get-close-closer", title: "Get close. Closer.", fileId: "1KmQ3DzEzBfb0JX76uWw1LEmqaH68B0dz", seasons: [], defaultPublic: false },
  { slug: "get-in-loser-20240406-4", title: "GET IN LOSER — 20240406.4", fileId: "1OdIZek2Oivdt08Gu5GaQ6Y41cNqdmYUZ", seasons: [], defaultPublic: false },
  { slug: "burn-in-hell", title: "Burn In Hell", fileId: "1ppR_LqWlK0LoWJkAJB-YVtnf6E543wPo", seasons: [], defaultPublic: false },
  { slug: "22-this-is-about-you", title: "22 — This is about you, this song. It's about you.", fileId: "1V61Hkr0gR3yHbskCXkT93VYqGgd77XzT", seasons: [], defaultPublic: false },
  { slug: "11-this-is", title: "11 — This is", fileId: "1scbZAYdC_nDbOdWHF0dG4EPghKIbXBfn", seasons: [], defaultPublic: false },
  { slug: "the-way-out-is-working-titles", title: "the-way-out is (working titles)", fileId: "1iUlH_H4WRS-KRsg74sBk-fIKzXgmpjd0", seasons: [], defaultPublic: false },
  { slug: "before-the-sickle", title: "Before the Sickle", fileId: "1kruX-2frTmOrT1eSqqt6UR9IRzlULZl9", seasons: [], defaultPublic: false },
  { slug: "slow-dive", title: "Slow Dive", fileId: "1vhxsc-11jCoPl_D8jw8AZUmc1qggxZMC", seasons: [], defaultPublic: false }
];

export function publicTrackForSlug(slug: string) {
  return PUBLIC_TRACKS.find(track => track.slug === slug) || null;
}

export function hostedTrackUrl(fileName: string | null | undefined) {
  if (!fileName) return null;
  return `${NAMECHEAP_AUDIO_BASE_URL.replace(/\/$/, "")}/${encodeURIComponent(fileName).replace(/%2F/g, "/")}`;
}

export function normalizePlayerSeasons(value: unknown, album?: string | null): PlayerSeason[] {
  const values = Array.isArray(value) ? value.map(String) : [];
  const valid = values.filter((item): item is PlayerSeason => PLAYER_SEASONS.includes(item as PlayerSeason));
  if (valid.length) return Array.from(new Set(valid));
  if (album && PLAYER_SEASONS.includes(album as PlayerSeason)) return [album as PlayerSeason];
  return [];
}
