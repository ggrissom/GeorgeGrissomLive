import { createHash, timingSafeEqual } from "node:crypto";\nimport { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 300;

const ONE_TIME_TOKEN_HASH = "8611aceb873d7c8d14c02444d8ff5c70c5eada82c901a08d15b63b06e3343d1f";

function authorized(token: string) {
  const actual = createHash("sha256").update(token).digest();
  const expected = Buffer.from(ONE_TIME_TOKEN_HASH, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function allowedSource(url: URL) {
  return url.protocol === "https:" && (
    url.hostname === "sdmntprwestus.oaiusercontent.com" ||
    url.hostname.endsWith(".oaiusercontent.com")
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const suppliedToken = requestUrl.searchParams.get("token") || "";
  if (!authorized(suppliedToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sourceRaw = requestUrl.searchParams.get("source") || "";
  const pathname = requestUrl.searchParams.get("path") || "";
  if (!sourceRaw || !/^paid-audio\/[a-z0-9-]+\.wav$/i.test(pathname)) {
    return NextResponse.json({ error: "Invalid migration request" }, { status: 400 });
  }

  let source: URL;
  try {
    source = new URL(sourceRaw);
  } catch {
    return NextResponse.json({ error: "Invalid source URL" }, { status: 400 });
  }
  if (!allowedSource(source)) {
    return NextResponse.json({ error: "Source host not allowed" }, { status: 400 });
  }

  const upstream = await fetch(source, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Source download failed", status: upstream.status },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get("content-type") || "";
  const contentLength = Number(upstream.headers.get("content-length") || "0");
  if (contentType && !/audio|wav|octet-stream/i.test(contentType)) {
    return NextResponse.json({ error: "Source is not audio" }, { status: 400 });
  }

  const blob = await put(pathname, upstream.body, {
    access: "private",
    addRandomSuffix: false,
    contentType: "audio/wav"
  });

  return NextResponse.json({
    ok: true,
    pathname: blob.pathname,
    size: Number.isFinite(contentLength) ? contentLength : null
  });
}
