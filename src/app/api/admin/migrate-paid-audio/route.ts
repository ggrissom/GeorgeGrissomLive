import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const TOKEN_ENV = "AUDIO_MIGRATION_TOKEN_20260927";

export async function GET(request: NextRequest) {
  const expected = process.env[TOKEN_ENV];
  const token = request.nextUrl.searchParams.get("token");
  const source = request.nextUrl.searchParams.get("source");
  const pathname = request.nextUrl.searchParams.get("pathname");

  if (!expected || !token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!source || !pathname) {
    return NextResponse.json({ error: "source and pathname are required" }, { status: 400 });
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return NextResponse.json({ error: "Invalid source URL" }, { status: 400 });
  }

  if (sourceUrl.protocol !== "https:" || !sourceUrl.hostname.endsWith(".oaiusercontent.com")) {
    return NextResponse.json({ error: "Source host not allowed" }, { status: 400 });
  }

  if (!/^paid-audio\/[a-z0-9-]+\.wav$/i.test(pathname)) {
    return NextResponse.json({ error: "Invalid destination pathname" }, { status: 400 });
  }

  const upstream = await fetch(sourceUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Source download failed", sourceStatus: upstream.status },
      { status: 502 }
    );
  }

  const size = Number(upstream.headers.get("content-length") || "0");
  if (size && size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: "Source file too large" }, { status: 413 });
  }

  const blob = await put(pathname, upstream.body, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "audio/wav",
    multipart: true
  });

  return NextResponse.json({
    ok: true,
    pathname: blob.pathname,
    contentType: blob.contentType,
    url: blob.url
  });
}
