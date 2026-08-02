export function publicSongQuery(searchParams: URLSearchParams) {
  if (searchParams.get("jukebox") === "1") {
    return {
      mode: "jukebox" as const,
      where: { isPublic: true },
      orderBy: [{ jukeboxOrder: "asc" as const }, { title: "asc" as const }],
    };
  }
  if (searchParams.get("unlock") === "1") {
    return {
      mode: "unlock" as const,
      where: { paidCatalog: true },
      orderBy: [{ title: "asc" as const }],
    };
  }
  return {
    mode: "request" as const,
    where: { publicShortlist: true, requestable: true },
    orderBy: [{ title: "asc" as const }],
  };
}
