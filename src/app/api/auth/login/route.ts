import { NextResponse } from "next/server";
import { createAdminToken, setAdminCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "");
  const password = String(body.password || "");

  const expectedEmail = process.env.ADMIN_EMAIL || "admin@georgegrissom.com";
  const expectedPassword = process.env.ADMIN_PASSWORD || "change-this-password";

  if (email !== expectedEmail || password !== expectedPassword) {
    return NextResponse.json({ error: "Invalid admin login." }, { status: 401 });
  }

  await setAdminCookie(createAdminToken(email));
  return NextResponse.json({ ok: true });
}
