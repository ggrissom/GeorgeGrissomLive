import { NextRequest,NextResponse } from "next/server";
import { database } from "./db";
import { BimStore, rateLimit, siteUrl, StoreError, stripeClient } from "./service";
export const store = () => new BimStore(database(),stripeClient());
export const privateHeaders = {"Cache-Control":"no-store, private","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"};
export function errorResponse(error: unknown) {
  const known = error instanceof StoreError;
  return NextResponse.json({error:known?error.message:"The store is temporarily unavailable. Please try again shortly."},{status:known?error.status:503,headers:privateHeaders});
}
export async function requestBody(req: NextRequest, browser = false) {
  if (browser && req.headers.get("origin") !== siteUrl()) throw new StoreError("Please open this form from the store.",403);
  if (Number(req.headers.get("content-length") || 0) > 4096) throw new StoreError("Request too large.",413);
  const raw = await req.text(); if (raw.length > 4096) throw new StoreError("Request too large.",413);
  await rateLimit(database(),`${req.nextUrl.pathname}:${req.headers.get("x-real-ip") || "local"}`,30);
  try { const body = JSON.parse(raw); if (!body || Array.isArray(body) || typeof body!=="object") throw new Error(); return body; }
  catch { throw new StoreError("Invalid request."); }
}
