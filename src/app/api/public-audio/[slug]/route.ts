import { NextResponse } from "next/server";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { publicTrackForSlug } from "@/lib/public-track-catalog";
import { isGoogleDriveAudioConfigured, readAudioFile } from "@/lib/audio-storage";

export const runtime = "nodejs";

const NAMECHEAP_HOST = "georgegrissom.com";
const NAMECHEAP_ORIGIN_IPS = process.env.NAMECHEAP_AUDIO_ORIGIN_IP
  ? [process.env.NAMECHEAP_AUDIO_ORIGIN_IP]
  : ["198.54.116.169", "198.54.114.169"];

function sourceLinksObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function namecheapOriginResponse(
  ip: string,
  fileName: string,
  range: string | null
): Promise<Response | null> {
  return new Promise((resolve) => {
    const path = `/mp3/${encodeURIComponent(fileName)}`;

    const req = httpsRequest(
      {
        hostname: ip,
        port: 443,
        method: "GET",
        path,
        servername: NAMECHEAP_HOST,
        headers: {
          Host: NAMECHEAP_HOST,
          ...(range ? { Range: range } : {})
        },
        timeout: 6000
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

        resolve(
          new Response(Readable.toWeb(res) as ReadableStream, {
            status,
            headers
          })
        );
      }
    );

    req.on("timeout", () => req.destroy(new Error("Namecheap audio origin timeout")));
    req.on("error", () => resolve(null));
    req.end();
  });
}

async function readNamecheapHostedFile(fileName: string, range: string | null) {
  for (const ip of NAMECHEAP_ORIGIN_IPS) {
    const response = await namecheapOriginResponse(ip, fileName, range);
    if (response) return response;
  }
  return null;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: key } = await params;

  const song = await prisma.song.findFirst({
    where: {
      isPublic: true,
      publicShortlist: true,
      OR: [
        { id: key },
        { slug: key }
      ]
    }
  });

  if (!song) return NextResponse.json({ error: "Track not found" }, { status: 404 });

  const links = sourceLinksObject(song.sourceLinks);
  const seeded = song.slug ? publicTrackForSlug(song.slug) : null;

  const hostedFileName =
    (typeof links.hostedFileName === "string" && links.hostedFileName) ||
    seeded?.hostedFileName ||
    null;

  if (hostedFileName) {
    const hosted = await readNamecheapHostedFile(
      hostedFileName,
      request.headers.get("range")
    );
    if (hosted) return hosted;
  }

  const driveFileId =
    (typeof links.fullMp3DriveFileId === "string" && links.fullMp3DriveFileId) ||
    (typeof links.driveFileId === "string" && links.driveFileId) ||
    seeded?.fileId ||
    null;

  try {
    if (driveFileId && !isGoogleDriveAudioConfigured()) {
      const direct = new URL("https://drive.usercontent.google.com/download");
      direct.searchParams.set("id", driveFileId);
      direct.searchParams.set("export", "download");
      direct.searchParams.set("confirm", "t");
      return Response.redirect(direct, 307);
    }

    if (driveFileId || song.audioPath) {
      const file = await readAudioFile(
        {
          driveFileId,
          localPath: song.audioPath
        },
        request.headers.get("range")
      );

      return new Response(file.body, {
        status: file.status,
        headers: {
          ...file.headers,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    if (song.audioUrl) {
      return Response.redirect(new URL(song.audioUrl, request.url), 307);
    }

    return NextResponse.json({ error: "Audio source not configured" }, { status: 404 });
  } catch (error) {
    console.error("Public audio stream failed", { key, songId: song.id, error });
    return NextResponse.json({ error: "Audio temporarily unavailable" }, { status: 503 });
  }
}
