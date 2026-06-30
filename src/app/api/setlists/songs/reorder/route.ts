import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!body.setlistId || !Array.isArray(body.songIds)) {
    return NextResponse.json({ error: "Missing setlistId or songIds" }, { status: 400 });
  }

  await prisma.$transaction(
    body.songIds.map((songId: string, position: number) =>
      prisma.setlistSong.update({
        where: { setlistId_songId: { setlistId: body.setlistId, songId } },
        data: { position }
      })
    )
  );

  return NextResponse.json({ ok: true });
}
