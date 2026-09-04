import path from "node:path";
import { readFile, stat } from "node:fs/promises";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export type AudioFileSource = {
  driveFileId?: string | null;
  localPath?: string | null;
};

export type AudioFileResponse = {
  body: Buffer;
  status: 200 | 206;
  headers: Record<string, string>;
};

export function isGoogleDriveAudioConfigured() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

export function googleDriveAudioServiceAccountEmail() {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null;
}

function serviceAccountKey() {
  return (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

function toBuffer(value: unknown) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === "string") return Buffer.from(value);
  throw new Error("Google Drive returned an unsupported audio payload.");
}

function parseRange(range: string | null | undefined, size: number) {
  if (!range) return null;
  const match = /bytes=(\d+)-(\d*)/.exec(range);
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= size) {
    return null;
  }
  return { start, end };
}

async function readLocalAudio(localPath: string, range?: string | null): Promise<AudioFileResponse> {
  const absolutePath = path.join(process.cwd(), localPath);
  const info = await stat(absolutePath);
  const parsed = parseRange(range, info.size);
  const file = await readFile(absolutePath);

  if (parsed) {
    const body = file.subarray(parsed.start, parsed.end + 1);
    return {
      body,
      status: 206,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${parsed.start}-${parsed.end}/${info.size}`,
        "Content-Length": String(body.length)
      }
    };
  }

  return {
    body: file,
    status: 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(file.length)
    }
  };
}

async function readDriveAudio(fileId: string, range?: string | null): Promise<AudioFileResponse> {
  if (!isGoogleDriveAudioConfigured()) {
    throw new Error("Google Drive audio credentials are not configured.");
  }

  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: serviceAccountKey(),
    scopes: [DRIVE_SCOPE]
  });
  const drive = google.drive({ version: "v3", auth });
  const response = await drive.files.get(
    { fileId, alt: "media" },
    {
      responseType: "arraybuffer",
      headers: range ? { Range: range } : undefined
    }
  );
  const body = toBuffer(response.data);
  const status = response.status === 206 ? 206 : 200;
  const contentRange = response.headers["content-range"];
  const acceptRanges = response.headers["accept-ranges"] || "bytes";

  return {
    body,
    status,
    headers: {
      "Accept-Ranges": String(acceptRanges),
      "Content-Length": String(response.headers["content-length"] || body.length),
      ...(contentRange ? { "Content-Range": String(contentRange) } : {})
    }
  };
}

export async function readAudioFile(source: AudioFileSource, range?: string | null) {
  if (source.driveFileId && isGoogleDriveAudioConfigured()) {
    return readDriveAudio(source.driveFileId, range);
  }
  if (source.localPath) {
    return readLocalAudio(source.localPath, range);
  }
  throw new Error("Audio file source is unavailable.");
}
