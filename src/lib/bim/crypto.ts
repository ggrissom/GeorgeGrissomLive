import { createHash, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";

export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const secret = () => randomBytes(32).toString("base64url");
export const activationKey = () => "BG-" + randomBytes(24).toString("hex").toUpperCase().match(/.{1,8}/g)!.join("-");
export const normalizeKey = (key: string) => key.trim().toUpperCase();
export function equalSecret(value: string, digest: string) {
  const actual = Buffer.from(hash(value)); const expected = Buffer.from(digest);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function encryptionKey() {
  const key = process.env.BIM_LICENSE_ENCRYPTION_KEY || "";
  if (!/^[a-fA-F0-9]{64}$/.test(key)) throw new Error("BIM_LICENSE_ENCRYPTION_KEY must be 32 bytes of hex");
  return Buffer.from(key, "hex");
}
export function encrypt(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString("base64url")).join(".");
}
export function decrypt(value: string) {
  const [iv, tag, data] = value.split(".").map(s => Buffer.from(s, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv); cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8");
}
