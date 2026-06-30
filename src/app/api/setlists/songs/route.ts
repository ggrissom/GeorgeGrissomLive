import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

async function nextPosition(setlistId: string) {
  const last = await prisma.setlistSong.findFirst({
    where: { setlistId },
    orderBy: { position: "desc" }
  });
  return (last?.position ?? -1) + 1;
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!body.songId) return NextResponse.json({ error: "Missing songId" }, { status: 400 });

  let setlistId = body.setlistId;
  if (!setlistId && body.setlistName) {
    let setlist = await prisma.setlist.findFirst({ where: { name: body.setlistName } });
    if (!setlist) {
      setlist = await prisma.setlist.create({
        data: {
          name: body.setlistName,
          venueName: body.venueName || "Venue TBA",
          isPrivate: true
        }
      });
    }
    setlistId = setlist.id;
  }

  if (!setlistId) return NextResponse.json({ error: "Missing setlistId or setlistName" }, { status: 400 });

  const existing = await prisma.setlistSong.findUnique({
    where: { setlistId_songId: { setlistId, songId: body.songId } }
  });

  if (existing) return NextResponse.json(existing);

  const item = await prisma.setlistSong.create({
    data: {
      setlistId,
      songId: body.songId,
      position: await nextPosition(setlistId),
      notes: body.notes || null
    },
    include: { song: true, setlist: true }
  });

  return NextResponse.json(item);
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const item = await prisma.setlistSong.update({
    where: { id: body.id },
    data: {
      position: body.position,
      notes: body.notes
    },
    include: { song: true, setlist: true }
  });

  return NextResponse.json(item);
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const setlistId = searchParams.get("setlistId");
  const songId = searchParams.get("songId");
  const id = searchParams.get("id");

  if (id) {
    await prisma.setlistSong.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  if (!setlistId || !songId) return NextResponse.json({ error: "Missing setlistId/songId" }, { status: 400 });
  await prisma.setlistSong.delete({
    where: { setlistId_songId: { setlistId, songId } }
  });
  return NextResponse.json({ ok: true });
}
