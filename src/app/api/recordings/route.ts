import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveUploadFile } from "@/lib/files";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const recordings = await prisma.recording.findMany({
    include: { event: true, song: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(recordings);
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing audio file." }, { status: 400 });

  const saved = await saveUploadFile(file, "recordings");
  const recording = await prisma.recording.create({
    data: {
      eventId: String(form.get("eventId") || "") || null,
      songId: String(form.get("songId") || "") || null,
      title: String(form.get("title") || "") || file.name,
      inputDeviceLabel: String(form.get("inputDeviceLabel") || "") || null,
      storagePath: saved.publicPath,
      mimeType: file.type || null,
      durationSeconds: Number(form.get("durationSeconds") || 0) || null,
      visibility: "private"
    }
  });

  return NextResponse.json(recording);
}
