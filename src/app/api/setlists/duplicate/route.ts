import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!body.sourceSetlistId) return NextResponse.json({ error: "Missing sourceSetlistId" }, { status: 400 });

  const source = await prisma.setlist.findUnique({
    where: { id: body.sourceSetlistId },
    include: { songs: { orderBy: { position: "asc" } } }
  });

  if (!source) return NextResponse.json({ error: "Source setlist not found" }, { status: 404 });

  const duplicate = await prisma.setlist.create({
    data: {
      name: body.name || `Copy of ${source.name}`,
      venueName: body.venueName || source.venueName,
      eventId: body.eventId || source.eventId || null,
      notes: body.notes || source.notes,
      isPrivate: true,
      songs: {
        create: source.songs.map(item => ({
          songId: item.songId,
          position: item.position,
          notes: item.notes
        }))
      }
    },
    include: {
      event: true,
      songs: {
        orderBy: { position: "asc" },
        include: { song: true }
      }
    }
  });

  return NextResponse.json(duplicate);
}
