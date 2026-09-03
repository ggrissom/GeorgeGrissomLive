import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const LISTENER_COOKIE = "gg_listener";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function getOrCreateListener() {
  const jar = await cookies();
  let token = jar.get(LISTENER_COOKIE)?.value;

  if (token) {
    const existing = await prisma.listener.findUnique({ where: { tokenHash: hashToken(token) } });
    if (existing) return existing;
  }

  token = crypto.randomBytes(32).toString("base64url");
  const listener = await prisma.listener.create({ data: { tokenHash: hashToken(token) } });
  jar.set(LISTENER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
  return listener;
}
