import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { PUBLIC_TRACKS, hostedTrackUrl } from "@/lib/public-track-catalog";

const PLAYER_SEASONS = ["From the Setlist", "A Taste For Crow"] as const;
type PlayerSeason = typeof PLAYER_SEASONS[number];

function sourceLinksObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function normalizeSeasons(value: unknown, fallback: readonly string[] = []): PlayerSeason[] {
  const raw = Array.isArray(value) ? value.map(String) : [...fallback];
  return Array.from(new Set(
    raw.filter((item): item is PlayerSeason =>
      PLAYER_SEASONS.includes(item as PlayerSeason)
    )
  ));
}

function primaryAlbum(seasons: PlayerSeason[]) {
  if (seasons.includes("A Taste For Crow")) return "A Taste For Crow";
  return seasons[0] || "Unsorted";
}

function catalogSeeds() {
  return PUBLIC_TRACKS.filter(
    seed => (seed.artist || "George Grissom") !== "Counterfist" && Boolean(seed.hostedFileName)
  );
}

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seeds = catalogSeeds();
  const slugs = seeds.map(seed => seed.slug);
  const rows = await prisma.song.findMany({ where: { slug: { in: slugs } } });
  const bySlug = new Map(rows.map(row => [row.slug, row]));

  const catalog = seeds.map(seed => {
    const row = bySlug.get(seed.slug);
    const sourceLinks = sourceLinksObject(row?.sourceLinks);
    const seasons = normalizeSeasons(sourceLinks.publicPlayerSeasons, seed.seasons);
    const fullUrl = row?.audioUrl || hostedTrackUrl(seed.hostedFileName) || "";

    return {
      id: row?.id || `catalog:${seed.slug}`,
      slug: seed.slug,
      title: row?.title || seed.title,
      artist: row?.artist || seed.artist || "George Grissom",
      album: row?.album || primaryAlbum(seasons),
      audioUrl: fullUrl,
      publicShortlist: row?.publicShortlist ?? seed.defaultPublic,
      requestable: row?.requestable ?? false,
      paidCatalog: row?.paidCatalog ?? false,
      minTipCents: row?.minTipCents ?? 0,
      freePlayLimit: row?.freePlayLimit ?? 3,
      isPublic: row?.isPublic ?? true,
      sourceLinks: {
        ...sourceLinks,
        catalogSeed: true,
        hostedFileName: seed.hostedFileName,
        publicPlayerSeasons: seasons,
        publicPlayerDefault: sourceLinks.publicPlayerDefault === true
      }
    };
  });

  return NextResponse.json(catalog);
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const slug = String(body.slug || "").trim();
  const seed = catalogSeeds().find(item => item.slug === slug);
  if (!seed) return NextResponse.json({ error: "Unknown player track" }, { status: 404 });

  const existing = await prisma.song.findUnique({ where: { slug } });
  const oldLinks = sourceLinksObject(existing?.sourceLinks);
  const seasons = normalizeSeasons(
    Object.prototype.hasOwnProperty.call(body, "seasons") ? body.seasons : oldLinks.publicPlayerSeasons,
    seed.seasons
  );
  const audioUrl = Object.prototype.hasOwnProperty.call(body, "audioUrl")
    ? String(body.audioUrl || "").trim()
    : (existing?.audioUrl || hostedTrackUrl(seed.hostedFileName) || "");
  const visible = Object.prototype.hasOwnProperty.call(body, "publicShortlist")
    ? Boolean(body.publicShortlist)
    : (existing?.publicShortlist ?? seed.defaultPublic);
  const defaultRequested = Object.prototype.hasOwnProperty.call(body, "isDefault")
    ? Boolean(body.isDefault)
    : oldLinks.publicPlayerDefault === true;

  if (visible && seasons.length === 0) {
    return NextResponse.json({ error: "A visible song must belong to at least one playlist." }, { status: 400 });
  }

  const nextLinks = {
    ...oldLinks,
    catalogSeed: true,
    fullMp3DriveFileId: oldLinks.fullMp3DriveFileId || seed.fileId,
    hostedFileName: seed.hostedFileName,
    publicPlayerSeasons: seasons,
    publicPlayerDefault: visible && defaultRequested
  };

  const saved = await prisma.song.upsert({
    where: { slug },
    update: {
      title: seed.title,
      artist: seed.artist || "George Grissom",
      album: primaryAlbum(seasons),
      audioUrl: audioUrl || null,
      publicShortlist: visible,
      isPublic: true,
      paidCatalog: false,
      sourceLinks: nextLinks
    },
    create: {
      slug,
      title: seed.title,
      artist: seed.artist || "George Grissom",
      album: primaryAlbum(seasons),
      audioUrl: audioUrl || null,
      publicShortlist: visible,
      requestable: false,
      isPublic: true,
      paidCatalog: false,
      sourceLinks: nextLinks
    }
  });

  if (visible && defaultRequested) {
    const others = await prisma.song.findMany({
      where: {
        slug: { in: catalogSeeds().map(item => item.slug), not: slug }
      },
      select: { id: true, sourceLinks: true }
    });

    await Promise.all(others.map(other => {
      const links = sourceLinksObject(other.sourceLinks);
      if (links.publicPlayerDefault !== true) return Promise.resolve(null);
      return prisma.song.update({
        where: { id: other.id },
        data: { sourceLinks: { ...links, publicPlayerDefault: false } }
      });
    }));
  }

  return NextResponse.json(saved);
}
