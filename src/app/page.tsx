export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ensurePublicPlayerCatalog } from "@/lib/ensure-public-player-catalog";
import { normalizePlayerSeasons } from "@/lib/public-track-catalog";
import { publicEventsFromPerformanceCalendar } from "@/lib/public-events";
import { PERFORMANCE_CALENDAR_ID, publicPerformanceCalendarIcalUrl } from "@/lib/google-calendar";
import { getSiteContent } from "@/lib/site-content";
import { digitalProductForSku, purchasableTrackForSlug } from "@/lib/digital-products";
import { getVisitorId } from "@/lib/jukebox-access";
import SiteShell from "./site-shell";

function sourceLinksObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export default async function Home() {
  await ensurePublicPlayerCatalog();
  const visitorId = await getVisitorId();

  const [events, songs, siteContent, songPurchases, paidDigitalPayments] = await Promise.all([
    publicEventsFromPerformanceCalendar(50),
    prisma.song.findMany({
      where: {
        isPublic: true,
        publicShortlist: true
      },
      orderBy: [
        { album: "asc" },
        { title: "asc" }
      ]
    }),
    getSiteContent(),
    visitorId
      ? prisma.songPurchase.findMany({ where: { visitorId }, select: { songId: true } })
      : Promise.resolve([]),
    visitorId
      ? prisma.payment.findMany({
          where: { type: "digital_product", status: "paid" },
          select: { metadata: true }
        })
      : Promise.resolve([])
  ]);

  const purchasedSongIds = new Set(songPurchases.map(purchase => purchase.songId));
  const tracks = songs.map(song => {
    const links = sourceLinksObject(song.sourceLinks);
    const product = purchasableTrackForSlug(song.slug);
    return {
      id: song.id,
      slug: song.slug,
      title: song.title,
      seasons: normalizePlayerSeasons(links.publicPlayerSeasons, song.album),
      purchaseSku: product?.sku || null,
      purchasePriceCents: product?.priceCents || null,
      purchased: purchasedSongIds.has(song.id)
    };
  });

  const albumProduct = digitalProductForSku("digital-album-preorder");
  const albumPreorderPurchased = paidDigitalPayments.some(payment => {
    const metadata = sourceLinksObject(payment.metadata);
    return metadata.visitorId === visitorId && metadata.sku === "digital-album-preorder";
  });
  const albumPreorder = albumProduct
    ? {
        sku: albumProduct.sku,
        title: albumProduct.title,
        priceCents: albumProduct.priceCents,
        enabled: albumProduct.enabled,
        purchased: albumPreorderPurchased
      }
    : null;

  const configuredDefault = songs.find(song => sourceLinksObject(song.sourceLinks).publicPlayerDefault === true);
  const fallbackDefault = songs.find(song => song.slug === "what-a-shame") || songs[0] || null;
  const defaultTrackId = configuredDefault?.id || fallbackDefault?.id || null;
  const calendarIcalUrl = publicPerformanceCalendarIcalUrl();
  const calendarWebcalUrl = calendarIcalUrl.replace(/^https?:\/\//, "webcal://");
  const googleCalendarSubscribeUrl =
    `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(PERFORMANCE_CALENDAR_ID)}`;

  return (
    <SiteShell
      initialEvents={events.map(event => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt || null,
        venueName: event.venueName,
        city: event.city,
        state: event.state,
        notes: event.notes
      }))}
      siteContent={siteContent}
      tracks={tracks}
      albumPreorder={albumPreorder}
      defaultTrackId={defaultTrackId}
      calendarWebcalUrl={calendarWebcalUrl}
      googleCalendarSubscribeUrl={googleCalendarSubscribeUrl}
    />
  );
}
