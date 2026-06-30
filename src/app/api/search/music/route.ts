import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { searchMusicBrainz, lyricSearchLinks } from "@/lib/metadata";

export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json({ results: [] });
  const results = await searchMusicBrainz(q.trim());
  return NextResponse.json({
    results: results.map(result => ({
      ...result,
      searchLinks: lyricSearchLinks(result.title, result.artist)
    }))
  });
}
