import { createDecipheriv, createHash } from "node:crypto";
import { prisma } from "@/lib/db";

const IV_B64 = "NgBR8g+shbLTOAt2";
const CIPHERTEXT_B64 = "DQzA/F6CSS827dB+h9LlE1Z7tcki8OvTP2PuDYWjkUmADxEIfPE=";
const AUTH_TAG_B64 = "LZpKI95nbZ6UC3GQjU+OZA==";
const LEGACY_CONTEXT = "gglive:stripe-webhook:v1\0";
const LEGACY_AAD = Buffer.from("georgegrissom.com/stripe/webhook");

const DB_CONTEXT = "gglive:stripe-webhook-db:v1\0";
const DB_AAD = Buffer.from("georgegrissom.com/stripe/webhook:db:v1");

async function databaseSigningSecret() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  try {
    const row = await prisma.payment.findFirst({
      where: { type: "internal_webhook_secret", status: "config" },
      orderBy: { createdAt: "desc" }
    });
    const metadata = (row?.metadata || {}) as Record<string, unknown>;
    const iv = typeof metadata.iv === "string" ? metadata.iv : "";
    const ciphertext = typeof metadata.ciphertext === "string" ? metadata.ciphertext : "";
    const authTag = typeof metadata.authTag === "string" ? metadata.authTag : "";
    if (!iv || !ciphertext || !authTag) return null;

    const key = createHash("sha256").update(DB_CONTEXT).update(databaseUrl).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
    decipher.setAAD(DB_AAD);
    decipher.setAuthTag(Buffer.from(authTag, "base64"));
    const secret = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64")),
      decipher.final()
    ]).toString("utf8");
    return secret.startsWith("whsec_") ? secret : null;
  } catch {
    return null;
  }
}

function legacyBlobSigningSecret() {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return null;

  try {
    const key = createHash("sha256").update(LEGACY_CONTEXT).update(blobToken).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(IV_B64, "base64"));
    decipher.setAAD(LEGACY_AAD);
    decipher.setAuthTag(Buffer.from(AUTH_TAG_B64, "base64"));
    const secret = Buffer.concat([
      decipher.update(Buffer.from(CIPHERTEXT_B64, "base64")),
      decipher.final()
    ]).toString("utf8");
    return secret.startsWith("whsec_") ? secret : null;
  } catch {
    return null;
  }
}

export async function stripeWebhookSigningSecret() {
  if (process.env.STRIPE_WEBHOOK_SECRET) return process.env.STRIPE_WEBHOOK_SECRET;
  return (await databaseSigningSecret()) || legacyBlobSigningSecret();
}
