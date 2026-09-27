import { createDecipheriv, createHash } from "node:crypto";

const IV_B64 = "NgBR8g+shbLTOAt2";
const CIPHERTEXT_B64 = "DQzA/F6CSS827dB+h9LlE1Z7tcki8OvTP2PuDYWjkUmADxEIfPE=";
const AUTH_TAG_B64 = "LZpKI95nbZ6UC3GQjU+OZA==";
const CONTEXT = "gglive:stripe-webhook:v1\0";
const AAD = Buffer.from("georgegrissom.com/stripe/webhook");

export function stripeWebhookSigningSecret() {
  if (process.env.STRIPE_WEBHOOK_SECRET) return process.env.STRIPE_WEBHOOK_SECRET;

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return null;

  try {
    const key = createHash("sha256").update(CONTEXT).update(blobToken).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(IV_B64, "base64"));
    decipher.setAAD(AAD);
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
