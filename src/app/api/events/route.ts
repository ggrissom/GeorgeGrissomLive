import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get("admin") === "1";
  const events = await prisma.event.findMany({
    where: admin ? undefined : { isPublic: true, startsAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 12) } },
    orderBy: { startsAt: "asc" }
  });
  return NextResponse.json(events);
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const event = await prisma.event.create({
    data: {
      title: body.title || "Live Show",
      venueName: body.venueName || "Venue TBA",
      city: body.city || null,
      state: body.state || null,
      notes: body.notes || null,
      startsAt: new Date(body.startsAt),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      isPublic: body.isPublic !== false
    }
  });
  return NextResponse.json(event);
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const event = await prisma.event.update({
    where: { id: body.id },
    data: {
      title: body.title,
      venueName: body.venueName,
      city: body.city,
      state: body.state,
      notes: body.notes,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      isPublic: body.isPublic
    }
  });
  return NextResponse.json(event);
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
