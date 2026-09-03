import crypto from "node:crypto";

type MediaTokenPayload = {
  songId: string;
  purpose: "stream" | "download";
  exp: number;
};

function secret() {
  const value = process.env.MEDIA_TOKEN_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("MEDIA_TOKEN_SECRET or ADMIN_SESSION_SECRET is required");
  return value || "dev-media-secret";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createMediaToken(songId: string, purpose: MediaTokenPayload["purpose"], ttlSeconds = 300) {
  const payload = Buffer.from(JSON.stringify({ songId, purpose, exp: Date.now() + ttlSeconds * 1000 } satisfies MediaTokenPayload)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyMediaToken(token: string | null, purpose: MediaTokenPayload["purpose"]) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as MediaTokenPayload;
    if (decoded.purpose !== purpose || decoded.exp < Date.now() || !decoded.songId) return null;
    return decoded;
  } catch {
    return null;
  }
}
