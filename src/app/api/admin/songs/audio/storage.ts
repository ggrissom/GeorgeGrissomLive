import { BlobNotFoundError } from "@vercel/blob";

export class AudioStorageConfigurationError extends Error {}
export class AudioStorageValidationError extends Error {}

type OwnedBlobDescriptor = {
  url: string;
  pathname: string;
};

function blobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new AudioStorageConfigurationError("Audio storage is not configured");
  }
  return token;
}

export function matchesOwnedBlobDescriptor(
  expectedUrl: string,
  expectedPathname: string | null,
  actual: OwnedBlobDescriptor,
): boolean {
  return Boolean(
    expectedPathname &&
      actual.url === expectedUrl &&
      actual.pathname === expectedPathname,
  );
}

export async function verifyUploadedJukeboxAudio(
  audioUrl: string,
  pathname: string,
) {
  const token = blobToken();
  try {
    const { head } = await import("@vercel/blob");
    const blob = await head(audioUrl, { token });
    if (!matchesOwnedBlobDescriptor(audioUrl, pathname, blob)) {
      throw new AudioStorageValidationError(
        "Uploaded audio does not belong to the configured store",
      );
    }
    return blob;
  } catch (error) {
    if (error instanceof AudioStorageValidationError) throw error;
    throw new AudioStorageValidationError("Uploaded audio could not be verified");
  }
}

export async function readOwnedJukeboxAudio(
  audioUrl: string,
  pathname: string,
) {
  const token = blobToken();
  const { get } = await import("@vercel/blob");
  const result = await get(audioUrl, {
    access: "public",
    token,
    useCache: false,
  });
  if (
    !result ||
    result.statusCode !== 200 ||
    !matchesOwnedBlobDescriptor(audioUrl, pathname, result.blob)
  ) {
    throw new AudioStorageValidationError("Uploaded audio could not be read");
  }
  return result;
}

export async function deleteOwnedJukeboxAudio(
  audioUrl: string,
  pathname: string,
  injected?: {
    head: (audioUrl: string) => Promise<OwnedBlobDescriptor & { etag: string }>;
    del: (pathname: string, etag: string) => Promise<void>;
  },
): Promise<boolean> {
  const operations =
    injected ??
    (await (async () => {
      const token = blobToken();
      const { del, head } = await import("@vercel/blob");
      return {
        head: (url: string) => head(url, { token }),
        del: (path: string, etag: string) =>
          del(path, { token, ifMatch: etag }),
      };
    })());
  let blob: OwnedBlobDescriptor & { etag: string };
  try {
    blob = await operations.head(audioUrl);
  } catch (error) {
    if (error instanceof BlobNotFoundError) return true;
    throw error;
  }
  if (!matchesOwnedBlobDescriptor(audioUrl, pathname, blob)) return false;
  try {
    await operations.del(pathname, blob.etag);
  } catch (error) {
    if (error instanceof BlobNotFoundError) return true;
    throw error;
  }
  return true;
}
