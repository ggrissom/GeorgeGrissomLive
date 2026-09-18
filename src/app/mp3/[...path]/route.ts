import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";

export const runtime = "nodejs";

const ORIGIN_HOST = "georgegrissom.com";
const ORIGIN_IPS = process.env.NAMECHEAP_AUDIO_ORIGIN_IP
  ? [process.env.NAMECHEAP_AUDIO_ORIGIN_IP]
  : ["198.54.116.169", "198.54.114.169"];

function fetchFromOrigin(
  ip: string,
  filePath: string,
  range: string | null
): Promise<Response | null> {
  return new Promise((resolve) => {
    const req = httpsRequest(
      {
        hostname: ip,
        port: 443,
        method: "GET",
        path: `/mp3/${filePath}`,
        servername: ORIGIN_HOST,
        headers: {
          Host: ORIGIN_HOST,
          ...(range ? { Range: range } : {})
        },
        timeout: 8000
      },
      (res) => {
        const status = res.statusCode || 502;
        if (status !== 200 && status !== 206) {
          res.resume();
          resolve(null);
          return;
        }

        const headers = new Headers({
          "Content-Type": String(res.headers["content-type"] || "audio/mpeg"),
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Accept-Ranges": String(res.headers["accept-ranges"] || "bytes"),
          "X-Content-Type-Options": "nosniff"
        });

        for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
          const value = res.headers[name];
          if (typeof value === "string") headers.set(name, value);
        }

        resolve(new Response(Readable.toWeb(res) as ReadableStream, { status, headers }));
      }
    );

    req.on("timeout", () => req.destroy(new Error("MP3 origin timeout")));
    req.on("error", () => resolve(null));
    req.end();
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = (path || []).map(segment => encodeURIComponent(decodeURIComponent(segment))).join("/");
  if (!filePath) return new Response("Not found", { status: 404 });

  for (const ip of ORIGIN_IPS) {
    const response = await fetchFromOrigin(ip, filePath, request.headers.get("range"));
    if (response) return response;
  }

  return new Response("Audio not found", { status: 404 });
}
