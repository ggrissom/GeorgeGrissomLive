import { get } from "@vercel/blob";

/** Stream player MP3s from Vercel; paid WAV masters use a separate route. */
export async function streamPlayerAudio(slug: string, range: string | null) {
  const result = await get(`player-audio/${slug}.mp3`, {
    access: "private",
    headers: range ? { Range: range } : undefined
  });
  if (!result || result.statusCode !== 200) {
    return new Response("Audio temporarily unavailable", { status: 503 });
  }
  const headers = new Headers({
    "Content-Type": "audio/mpeg",
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff"
  });
  for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = result.headers.get(name);
    if (value) headers.set(name, value);
  }
  // The SDK reports 200 for successful reads, including upstream byte ranges.
  return new Response(result.stream, {
    status: headers.has("content-range") ? 206 : 200,
    headers
  });
}
