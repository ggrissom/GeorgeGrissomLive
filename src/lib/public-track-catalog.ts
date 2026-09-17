export const PLAYER_SEASONS = [
  "Counterfist Archive",
  "From the Setlist",
  "A Taste for Crow"
] as const;

export type PlayerSeason = typeof PLAYER_SEASONS[number] | "Unsorted";

export type PublicTrackSeed = {
  slug: string;
  title: string;
  fileId: string;
  season: PlayerSeason;
  defaultPublic: boolean;
  artist?: string;
  aliases?: string[];
};

export const PUBLIC_TRACKS: PublicTrackSeed[] = [
  { slug: "this-song-is-about-you", title: "This Song Is About You", fileId: "1d6PuYw4EnFQSz8PT5plQlnWN9SQkAlwm", season: "A Taste for Crow", defaultPublic: true },
  { slug: "one-question", title: "One Question", fileId: "1r7oOGiQgoWqnAvHnlm2msOInZ78YnyOV", season: "A Taste for Crow", defaultPublic: true },
  { slug: "nose-to-the-grindstone", title: "Nose to the Grindstone", fileId: "1A5suXnpT6tO-cB_DxGvfpRtbVV3nPnDa", season: "A Taste for Crow", defaultPublic: true },
  { slug: "get-in-loser", title: "Get In Loser", fileId: "1hOvmSqNd8sJQKhKZnDYoSGzssP4rKpX-", season: "A Taste for Crow", defaultPublic: true },
  { slug: "damnit-just-you-hold-on", title: "Damnit, Just You Hold On", fileId: "1He1tB4oYsn305S2B-OUIim2f6o3TOIcQ", season: "A Taste for Crow", defaultPublic: true },
  { slug: "and-another-thing", title: "And Another Thing", fileId: "1Op07qVypypgnrBT1XcxzDk3Tjqy6uyd0", season: "A Taste for Crow", defaultPublic: true, aliases: ["And another thing", "...And another thing"] },
  { slug: "what-a-shame", title: "What a Shame", fileId: "1j-jXKv8XWXjNSpM29ICqPRi_yItIGrk9", season: "A Taste for Crow", defaultPublic: true },

  { slug: "counterfist-prison-cell-remaster", title: "Prison Cell — Remaster", fileId: "1Uh6llVVwkMqjEVhl2jnMOyjgMBGQcZzz", season: "Counterfist Archive", defaultPublic: true, artist: "Counterfist", aliases: ["counterfist prison-cell Re-re-mass-turd"] },
  { slug: "counterfist-prison-cell", title: "Prison Cell", fileId: "1R8XRipjFknzhjpwxgD6sMu0Y_kVR_AFG", season: "Counterfist Archive", defaultPublic: true, artist: "Counterfist", aliases: ["counterfist-prison-cell"] },

  { slug: "toyota-4", title: "Introducing, The All New Toyota Get Some", fileId: "1k-BZzxJBz0vc1BNf_ST6cevVtnx1Pxxo", season: "A Taste for Crow", defaultPublic: true, aliases: ["Toyota 4", "Introducing the All new Toyota Foreplay"] },
  { slug: "toyota-2", title: "Toyota 2", fileId: "1gXYo21QGlsfUh6o64YVdHog6Qh-veR96", season: "Unsorted", defaultPublic: false },
  { slug: "this-is-about-you", title: "This is about you, this song. It's about you.", fileId: "11aeRjsefHndZdkKXBoR7patn6eRVUamF", season: "Unsorted", defaultPublic: false },
  { slug: "this-boy-this-girl", title: "This Boy, This Girl", fileId: "1L2YZCex0MRGkGSf8HvNbaIG1dtf9WN-e", season: "Unsorted", defaultPublic: false },
  { slug: "this-boy-this-girl-allay", title: "This Boy, This Girl, Allay", fileId: "1Zd5HfnhpbfX0JV9JIgor3LjJ0GdiCxg9", season: "Unsorted", defaultPublic: false },
  { slug: "one-question-boy-this-is-girl", title: "One Question — Boy, this is girl", fileId: "1PGDelNbXCiv5tU-GqXCmB4tirqYQL07b", season: "Unsorted", defaultPublic: false },

  { slug: "medieval", title: "Medieval", fileId: "1DrEGN6rSOzgniKlM5sr4pvNW72RulJC3", season: "A Taste for Crow", defaultPublic: true },
  { slug: "lahar", title: "Lahar", fileId: "1Lc1L_1oquHP4EGAJIq22OvJYLcjeMGU5", season: "A Taste for Crow", defaultPublic: true },
  { slug: "get-close-closer", title: "Get close. Closer.", fileId: "1KmQ3DzEzBfb0JX76uWw1LEmqaH68B0dz", season: "Unsorted", defaultPublic: false },
  { slug: "get-in-loser-20240406-4", title: "GET IN LOSER — 20240406.4", fileId: "1OdIZek2Oivdt08Gu5GaQ6Y41cNqdmYUZ", season: "Unsorted", defaultPublic: false },
  { slug: "dumb-dumb", title: "Dumb Dumb", fileId: "1DFefc7kToTX1sIgCQjJdN8vgsawZ2Efg", season: "A Taste for Crow", defaultPublic: true },

  { slug: "counterfist-raivival-sound-wreck", title: "Counterfist Ra.i.vival Covers — Sound Wreck", fileId: "1X5LYvZzHz_4DP97nj7Ky71I-LNfCkKL0", season: "Counterfist Archive", defaultPublic: true, artist: "Counterfist", aliases: ["Counterfist Ra.i.vival Covers - Sound Wreck"] },

  { slug: "burn-in-hell", title: "Burn In Hell", fileId: "1ppR_LqWlK0LoWJkAJB-YVtnf6E543wPo", season: "Unsorted", defaultPublic: false },
  { slug: "22-this-is-about-you", title: "22 — This is about you, this song. It's about you.", fileId: "1V61Hkr0gR3yHbskCXkT93VYqGgd77XzT", season: "Unsorted", defaultPublic: false },
  { slug: "11-this-is", title: "11 — This is", fileId: "1scbZAYdC_nDbOdWHF0dG4EPghKIbXBfn", season: "Unsorted", defaultPublic: false },
  { slug: "the-way-out-is-working-titles", title: "the-way-out is (working titles)", fileId: "1iUlH_H4WRS-KRsg74sBk-fIKzXgmpjd0", season: "Unsorted", defaultPublic: false },
  { slug: "before-the-sickle", title: "Before the Sickle", fileId: "1kruX-2frTmOrT1eSqqt6UR9IRzlULZl9", season: "Unsorted", defaultPublic: false },

  { slug: "who-did-that-to-you", title: "Who Did That To You?", fileId: "1AW6RI5Rhgql5wLdho6e3-acR5mml66lp", season: "From the Setlist", defaultPublic: true, aliases: ["Who Did That To You"] },
  { slug: "white-house-road", title: "White House Road", fileId: "1xZyobHpKTdIx7VuqC1QlJf8EJ-FPygM9", season: "From the Setlist", defaultPublic: true },
  { slug: "the-seed", title: "The Seed", fileId: "1RHi7udbWPy258fO_0Xnf1vBJq9NEINSM", season: "From the Setlist", defaultPublic: true },
  { slug: "slow-dive", title: "Slow Dive", fileId: "1vhxsc-11jCoPl_D8jw8AZUmc1qggxZMC", season: "Unsorted", defaultPublic: false },
  { slug: "old-macdonald", title: "Old MacDonald", fileId: "1-5YSK37jjkcJNt4qWfPD-Gn5FQfvu9VX", season: "From the Setlist", defaultPublic: true },

  { slug: "need-the-cage", title: "Need the Cage", fileId: "1OYraGiCjd-Ovwe10-cM7swZoCZJLJWHY", season: "A Taste for Crow", defaultPublic: true },
  { slug: "light-under-the-moon", title: "Own Light Under The Moon", fileId: "1vIyRrCgdl1aS7hxnEGsnAy96vINYFKGR", season: "A Taste for Crow", defaultPublic: true, aliases: ["Light Under the Moon", "Own Light Under The Moon"] },
  { slug: "grass-before-the-sickle", title: "Grass Before the Sickle (ongoing concern)", fileId: "1YM4SuqZTADyAiZdDSzMdypUmaNzUzwyy", season: "A Taste for Crow", defaultPublic: true, aliases: ["Grass Before the Sickle"] },
  { slug: "evangelina", title: "Evangelina", fileId: "1f0BbrQ5-3_QxYmaPeTQ7Q8o-ypg2yJ6d", season: "From the Setlist", defaultPublic: true }
];

export function publicTrackForSlug(slug: string) {
  return PUBLIC_TRACKS.find(track => track.slug === slug) || null;
}

export function normalizePlayerSeason(value: string | null | undefined): PlayerSeason {
  if (PLAYER_SEASONS.includes(value as any)) return value as PlayerSeason;
  return "Unsorted";
}
