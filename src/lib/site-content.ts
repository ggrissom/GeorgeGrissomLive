import { prisma } from "@/lib/db";

export const SITE_CONTENT_SLUG = "__site-content";

export type SiteContent = {
  heroLead: string;
  heroProof: string;
  bookingIntro: string;
  storyIntro: string;
  counterfistHeading: string;
  counterfistBody: string;
  setlistHeading: string;
  setlistBody: string;
  crowHeading: string;
  crowBody: string;
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroLead:
    "One voice, one guitar, loops and rhythm underfoot—an acoustic performance that can stay intimate or grow until it feels like a full band in the room.",
  heroProof:
    "Early histories of Counterfist described George as the “perfect choice” to front the band, reflecting how the band’s voice and darker live energy were being received at the time. That thread carried into later solo work, where the same voice moved into smaller rooms—winery patios, bar rooms, weddings, and late happy hours—without the full-band volume.",
  bookingIntro:
    "Bars, wineries, weddings, corporate events, private parties, listening rooms, or something that does not fit neatly into a category. Solo acoustic can stay stripped down or expand with looping and drum machines for a fuller-band feel.",
  storyIntro:
    "Counterfist, the acoustic set, and A Taste For Crow have never behaved like tidy chapters. They overlap, disappear, return, and keep feeding the same instinct: follow the song wherever it wants to go.",
  counterfistHeading: "1999–2012, roughly",
  counterfistBody:
    "Counterfist was the most explosive version of it: loud, physical, progressive/alternative rock built for clubs, volume, and a full band moving at once. George fronted the band through Chiral, Vertical Mile, and the Give Up the Ghost EP, with Seattle shows including The Showbox, Neumos, and El Corazón.",
  setlistHeading: "2000–present",
  setlistBody:
    "Running alongside the band years and continuing today: bars, wineries, wedding receptions, corporate rooms, and private events. Acoustic guitar, looping, and drum machines let one performer build the weight and movement of a full band without losing the intimacy of a solo set.",
  crowHeading: "The words came back",
  crowBody:
    "A Taste For Crow began with one lonely songwriting session just after George got married, then went quiet lyrically for more than eleven years. After the marriage ended, the pain opened something again. Old instrumentals started finding new words and new lives. For George, writing is discovery more than assignment: the feeling arrives, the words follow, and once it starts there is very little choice but to let the song come through."
};

const LEGACY_HERO_PROOF = "Early Counterfist histories called George the “perfect choice” to front the band. Listeners have singled out the voice and the dark, forceful energy around it. Two decades later, that same voice can fill a winery patio, a bar room, a wedding, or a late happy hour without losing the closeness of a solo performance.";
const STORY_HERO_PROOF = "Early histories of Counterfist described George as the “perfect choice” to front the band, reflecting how the band’s voice and darker live energy were being received at the time. That thread carried into later solo work, where the same voice moved into smaller rooms—winery patios, bar rooms, weddings, and late happy hours—without the full-band volume.";

function cleanContent(value: unknown): SiteContent {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  if (source.heroProof === LEGACY_HERO_PROOF) source.heroProof = STORY_HERO_PROOF;

  return Object.fromEntries(
    Object.entries(DEFAULT_SITE_CONTENT).map(([key, fallback]) => [
      key,
      typeof source[key] === "string" && String(source[key]).trim()
        ? String(source[key])
        : fallback
    ])
  ) as SiteContent;
}

export async function getSiteContent(): Promise<SiteContent> {
  const row = await prisma.song.findUnique({ where: { slug: SITE_CONTENT_SLUG } });
  return cleanContent(row?.sourceLinks);
}

export async function saveSiteContent(input: unknown): Promise<SiteContent> {
  const content = cleanContent(input);
  await prisma.song.upsert({
    where: { slug: SITE_CONTENT_SLUG },
    create: {
      slug: SITE_CONTENT_SLUG,
      title: "Site Content Settings",
      artist: "George Grissom",
      isPublic: false,
      publicShortlist: false,
      paidCatalog: false,
      requestable: false,
      sourceLinks: content as any
    },
    update: {
      sourceLinks: content as any,
      isPublic: false,
      publicShortlist: false,
      requestable: false
    }
  });
  return content;
}
