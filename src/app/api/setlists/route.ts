import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const setlists = await prisma.setlist.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { venueName: { contains: q } },
            { notes: { contains: q } }
          ]
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      event: true,
      songs: {
        orderBy: { position: "asc" },
        include: { song: true }
      }
    }
  });
  return NextResponse.json(setlists);
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();

  const setlist = await prisma.setlist.create({
    data: {
      name: body.name || "Untitled Setlist",
      venueName: body.venueName || "Venue TBA",
      eventId: body.eventId || null,
      notes: body.notes || null,
      isPrivate: body.isPrivate !== false
    },
    include: {
      event: true,
      songs: { orderBy: { position: "asc" }, include: { song: true } }
    }
  });

  return NextResponse.json(setlist);
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const setlist = await prisma.setlist.update({
    where: { id: body.id },
    data: {
      name: body.name,
      venueName: body.venueName,
      eventId: Object.prototype.hasOwnProperty.call(body, "eventId") ? (body.eventId || null) : undefined,
      notes: body.notes,
      isPrivate: body.isPrivate
    },
    include: {
      event: true,
      songs: { orderBy: { position: "asc" }, include: { song: true } }
    }
  });

  return NextResponse.json(setlist);
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.setlist.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
