import os from "node:os";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const TEMP_UPLOAD_ROOT = path.join(os.tmpdir(), "george-grissom-live", "uploads");
const PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const BLOB_TOKEN_ENV = "BLOB_READ_WRITE_TOKEN";

export function hasPersistentUploadStorage() {
  return Boolean(process.env[BLOB_TOKEN_ENV]);
}

export function safeFileName(name: string) {
  const base = name.replace(/[^a-zA-Z0-9.\-_]/g, "-").replace(/-+/g, "-");
  return `${Date.now()}-${base || "upload"}`;
}

async function uploadToBlobStorage(fileName: string, file: File, buffer: Buffer) {
  if (!hasPersistentUploadStorage()) return null;
  const { put } = await import("@vercel/blob");
  const blob = await put(`uploads/${fileName}`, buffer, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type || undefined
  });
  return blob.url;
}

export async function saveUploadFile(
  file: File,
  folder: "imports" | "recordings" | "fan-media",
  options?: { requirePersistent?: boolean }
) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = safeFileName(file.name || `${folder}.bin`);
  const tempDir = path.join(TEMP_UPLOAD_ROOT, folder);
  await mkdir(tempDir, { recursive: true });
  const absolutePath = path.join(tempDir, fileName);
  await writeFile(absolutePath, buffer);

  let storagePath = await uploadToBlobStorage(`${folder}/${fileName}`, file, buffer);
  if (!storagePath) {
    if (options?.requirePersistent) {
      throw new Error(`Persistent upload storage is not configured. Set ${BLOB_TOKEN_ENV}.`);
    }
    const publicDir = path.join(PUBLIC_UPLOAD_ROOT, folder);
    await mkdir(publicDir, { recursive: true });
    await writeFile(path.join(publicDir, fileName), buffer);
    storagePath = `/uploads/${folder}/${fileName}`;
  }

  return {
    absolutePath,
    publicPath: storagePath,
    storagePath,
    bytes: buffer.length
  };
}
