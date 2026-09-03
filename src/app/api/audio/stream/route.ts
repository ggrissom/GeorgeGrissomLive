import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { verifyMediaToken } from "@/lib/media-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const payload = verifyMediaToken(searchParams.get("token"), "stream");
  if (!payload) return NextResponse.json({ error: "Invalid or expired media token" }, { status: 401 });

  const song = await prisma.song.findUnique({ where: { id: payload.songId } });
  if (!song?.privateAudioPath) return NextResponse.json({ error: "Audio unavailable" }, { status: 404 });

  const result = await get(song.privateAudioPath, { access: "private" });
  if (!result || result.statusCode !== 200) return new NextResponse("Audio not found", { status: 404 });

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "audio/mpeg",
      "Content-Length": String(result.blob.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
