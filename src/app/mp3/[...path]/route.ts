import { PUBLIC_TRACKS } from "@/lib/public-track-catalog";

export const runtime = "nodejs";

/** Preserve existing MP3 links while enforcing the player's visibility rules. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const fileName = (path || []).join("/");
  const track = PUBLIC_TRACKS.find(item => item.hostedFileName === fileName);
  if (!track) return new Response("Not found", { status: 404 });
  return Response.redirect(new URL(`/api/public-audio/${track.slug}`, request.url), 307);
}
