import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveUploadFile } from "@/lib/files";
import { parseImportFile } from "@/lib/importers";
import { normalizeSongRow } from "@/lib/catalog-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a CSV, Excel, PDF, text, or image file." }, { status: 400 });
  }

  const saved = await saveUploadFile(file, "imports");
  const job = await prisma.importJob.create({
    data: {
      fileName: file.name,
      fileType: file.type || "unknown",
      storagePath: saved.publicPath,
      status: "parsing"
    }
  });

  const parsedRows = await parseImportFile(saved.absolutePath, file.type || "", file.name);
  const rows = [];
  for (const parsed of parsedRows.slice(0, 300)) {
    const proposed = await normalizeSongRow(parsed.rawText, parsed.cells);
    const row = await prisma.importRow.create({
      data: {
        importJobId: job.id,
        rawText: parsed.rawText,
        proposed: proposed as any,
        warnings: proposed.warnings as any
      }
    });
    rows.push(row);
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: { status: rows.length ? "pending_review" : "needs_manual_review" }
  });

  return NextResponse.json({ jobId: job.id, rows });
}

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const jobs = await prisma.importJob.findMany({
    include: { rows: true },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  return NextResponse.json(jobs);
}
