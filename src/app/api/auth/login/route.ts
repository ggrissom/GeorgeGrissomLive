import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminToken, setAdminCookie } from "@/lib/auth";

const ADMIN_EMAIL = "admin@georgegrissom.com";
const ADMIN_PASSWORD_SHA256 = "bb4ba4473410b7e8feb7618d13f585161555faf7f54029fd9f9685c27f4511f5";

function secureEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const passwordHash = crypto.createHash("sha256").update(password, "utf8").digest("hex");

  if (!secureEqual(email, ADMIN_EMAIL) || !secureEqual(passwordHash, ADMIN_PASSWORD_SHA256)) {
    return NextResponse.json({ error: "Invalid admin login." }, { status: 401 });
  }

  await setAdminCookie(createAdminToken(ADMIN_EMAIL));
  return NextResponse.json({ ok: true });
}
