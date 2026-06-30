import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export function safeFileName(name: string) {
  const base = name.replace(/[^a-zA-Z0-9.\-_]/g, "-").replace(/-+/g, "-");
  return `${Date.now()}-${base || "upload"}`;
}

export async function saveUploadFile(file: File, folder: "imports" | "recordings" | "fan-media") {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const dir = path.join(UPLOAD_ROOT, folder);
  await mkdir(dir, { recursive: true });
  const fileName = safeFileName(file.name || `${folder}.bin`);
  const absolutePath = path.join(dir, fileName);
  await writeFile(absolutePath, buffer);
  return {
    absolutePath,
    publicPath: `/uploads/${folder}/${fileName}`,
    bytes: buffer.length
  };
}
