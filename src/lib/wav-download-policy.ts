type HeaderSource = Record<string, string | undefined>;

function safeWavFileName(fileName: string) {
  const firstSegment = fileName.split(/[\r\n"]/)[0].trim();
  const base = firstSegment || "download";
  return base.toLowerCase().endsWith(".wav") ? base : `${base}.wav`;
}

export function wavDownloadHeaders(fileName: string, upstream: HeaderSource) {
  const safeName = safeWavFileName(fileName);
  return {
    "Content-Type": "audio/wav",
    "Content-Disposition": `attachment; filename="${safeName}"`,
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    ...(upstream["accept-ranges"] ? { "Accept-Ranges": upstream["accept-ranges"] } : {}),
    ...(upstream["content-range"] ? { "Content-Range": upstream["content-range"] } : {}),
    ...(upstream["content-length"] ? { "Content-Length": upstream["content-length"] } : {})
  };
}
