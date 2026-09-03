import crypto from "node:crypto";
import { cookies } from "next/headers";

const VISITOR_COOKIE = "gg_visitor";

export async function getVisitorId() {
  const store = await cookies();
  return store.get(VISITOR_COOKIE)?.value || null;
}

export function ensureVisitorId(existing?: string | null) {
  return existing || crypto.randomUUID();
}

export function setVisitorCookie(response: Response, visitorId: string) {
  response.headers.append(
    "Set-Cookie",
    `${VISITOR_COOKIE}=${encodeURIComponent(visitorId)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax; Secure`
  );
}

function secret() {
  const value = process.env.PLAY_TOKEN_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("PLAY_TOKEN_SECRET or ADMIN_SESSION_SECRET must be configured");
  return value;
}

export function createPlayToken(visitorId: string, slug: string, ttlSeconds = 60 * 10) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${visitorId}.${slug}.${expires}`;
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyPlayToken(token: string, visitorId: string, slug: string) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length < 4) return false;
    const signature = parts.pop()!;
    const expires = Number(parts.pop());
    const tokenSlug = parts.pop()!;
    const tokenVisitor = parts.join(".");
    if (tokenVisitor !== visitorId || tokenSlug !== slug || !Number.isFinite(expires) || expires < Date.now() / 1000) return false;
    const payload = `${tokenVisitor}.${tokenSlug}.${expires}`;
    const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
