import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId, verifyPlayToken } from "@/lib/jukebox-access";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const visitorId = await getVisitorId();
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!visitorId || !verifyPlayToken(token, visitorId, slug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const song = await prisma.song.findUnique({ where: { slug } });
  if (!song?.audioPath) return NextResponse.json({ error: "Audio unavailable" }, { status: 404 });

  const absolutePath = path.join(process.cwd(), song.audioPath);
  const info = await stat(absolutePath);
  const range = request.headers.get("range");

  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
      const file = await readFile(absolutePath);
      const chunk = file.subarray(start, end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          "Content-Type": "audio/mpeg",
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${start}-${end}/${info.size}`,
          "Content-Length": String(chunk.length),
          "Cache-Control": "private, no-store"
        }
      });
    }
  }

  const file = await readFile(absolutePath);
  return new Response(file, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(file.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store"
    }
  });
}
