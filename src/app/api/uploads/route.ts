import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveUploadFile } from "@/lib/files";
import { isAdminRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get("admin") === "1" && await isAdminRequest();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uploads = await prisma.fanUpload.findMany({ include: { event: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(uploads);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  const saved = await saveUploadFile(file, "fan-media");
  const upload = await prisma.fanUpload.create({
    data: {
      eventId: String(form.get("eventId") || "") || null,
      uploaderName: String(form.get("uploaderName") || "") || null,
      note: String(form.get("note") || "") || null,
      storagePath: saved.publicPath,
      fileName: file.name,
      mimeType: file.type || null
    }
  });
  return NextResponse.json(upload);
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const upload = await prisma.fanUpload.update({
    where: { id: body.id },
    data: { status: body.status }
  });
  return NextResponse.json(upload);
}
