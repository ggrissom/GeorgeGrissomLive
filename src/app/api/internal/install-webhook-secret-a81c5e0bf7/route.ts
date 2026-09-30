import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const CONTEXT = "gglive:stripe-webhook-db:v1\0";
const AAD = Buffer.from("georgegrissom.com/stripe/webhook:db:v1");

function keyFromDatabaseUrl(databaseUrl: string) {
  return createHash("sha256").update(CONTEXT).update(databaseUrl).digest();
}

export async function GET() {
  return new Response(`<!doctype html>
<html><head><meta name="robots" content="noindex,nofollow"><title>Install webhook secret</title></head>
<body><form method="post"><label>Webhook secret <input name="secret" type="password" autocomplete="off"></label><button type="submit">Install</button></form></body></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export async function POST(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return NextResponse.json({ ok: false, error: "DATABASE_URL unavailable" }, { status: 503 });

  const form = await request.formData();
  const secret = String(form.get("secret") || "").trim();
  if (!secret.startsWith("whsec_") || secret.length < 20) {
    return NextResponse.json({ ok: false, error: "Invalid signing secret" }, { status: 400 });
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromDatabaseUrl(databaseUrl), iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  await prisma.payment.deleteMany({ where: { type: "internal_webhook_secret" } });
  await prisma.payment.create({
    data: {
      type: "internal_webhook_secret",
      amountCents: 0,
      status: "config",
      metadata: {
        version: 1,
        iv: iv.toString("base64"),
        ciphertext: ciphertext.toString("base64"),
        authTag: authTag.toString("base64")
      }
    }
  });

  return new Response("<!doctype html><html><body><strong>Installed.</strong></body></html>", {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}
