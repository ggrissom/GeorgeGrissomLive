import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { getSiteContent, saveSiteContent } from "@/lib/site-content";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getSiteContent());
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(await saveSiteContent(body));
}
