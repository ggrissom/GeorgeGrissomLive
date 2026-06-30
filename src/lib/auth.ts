import { cookies } from "next/headers";
import crypto from "node:crypto";

const COOKIE_NAME = "gg_admin_session";

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "dev-secret-change-me";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createAdminToken(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, ts: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token?: string | null) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email: string; ts: number };
    const maxAgeMs = 1000 * 60 * 60 * 24 * 7;
    return decoded.email === (process.env.ADMIN_EMAIL || "admin@georgegrissom.com") && Date.now() - decoded.ts < maxAgeMs;
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!verifyAdminToken(token)) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

export async function setAdminCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function isAdminRequest() {
  const jar = await cookies();
  return verifyAdminToken(jar.get(COOKIE_NAME)?.value);
}
