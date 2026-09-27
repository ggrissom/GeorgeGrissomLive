import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const ONE_TIME_TOKEN_HASH = "8611aceb873d7c8d14c02444d8ff5c70c5eada82c901a08d15b63b06e3343d1f";

function authorized(token: string) {
  const actual = createHash("sha256").update(token).digest();
  const expected = Buffer.from(ONE_TIME_TOKEN_HASH, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const secret = typeof body.stripeWebhookSecret === "string" ? body.stripeWebhookSecret : "";

  if (!authorized(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!secret.startsWith("whsec_")) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 400 });
  }

  await prisma.payment.deleteMany({ where: { type: "_system_stripe_webhook_secret" } });
  await prisma.payment.create({
    data: {
      type: "_system_stripe_webhook_secret",
      amountCents: 0,
      status: "active",
      metadata: { secret }
    }
  });

  return NextResponse.json({ ok: true });
}
