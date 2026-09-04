from pathlib import Path
import json

ROOT = Path('.')

def read(path: str) -> str:
    return (ROOT / path).read_text()

def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)

def replace(path: str, old: str, new: str) -> None:
    content = read(path)
    if old not in content:
        raise RuntimeError(f"Expected text not found in {path}: {old[:100]!r}")
    write(path, content.replace(old, new))

replace('prisma/schema.prisma','  previewUrl            String?\n  audioPath             String?\n','  previewUrl            String?\n  previewPath           String?\n  audioPath             String?\n  downloadPath          String?\n')
replace('package.json','"build": "prisma generate && prisma db push --accept-data-loss && npm run db:seed-live-audio && next build",','"build": "prisma generate && prisma db push && npm run db:seed-live-audio && next build",\n    "test:unit": "tsx --test src/lib/*.test.ts",\n    "typecheck": "tsc --noEmit",')

write('src/lib/audio-paths.ts', r'''export type AudioStorageRef =
  | { provider: "drive"; fileId: string }
  | { provider: "local"; filePath: string };

export type AudioAssetKind = "preview" | "stream" | "download";

export function parseAudioStorageRef(value: string | null | undefined): AudioStorageRef | null {
  const ref = String(value || "").trim();
  if (!ref) return null;
  if (ref.startsWith("drive:")) {
    const fileId = ref.slice("drive:".length).trim();
    return fileId ? { provider: "drive", fileId } : null;
  }
  if (ref.startsWith("local:")) {
    const filePath = ref.slice("local:".length).trim();
    return filePath ? { provider: "local", filePath } : null;
  }
  return { provider: "local", filePath: ref };
}

export function audioContentType(kind: AudioAssetKind) {
  return kind === "download" ? "audio/wav" : "audio/mpeg";
}

export function audioDownloadName(slug: string) {
  const safeSlug = slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "george-grissom-song";
  return `${safeSlug}.wav`;
}

export function hasStoredAudio(value: string | null | undefined) {
  return parseAudioStorageRef(value) !== null;
}
''')
write('src/lib/audio-paths.test.ts', r'''import test from "node:test";
import assert from "node:assert/strict";
import { audioContentType, audioDownloadName, hasStoredAudio, parseAudioStorageRef } from "./audio-paths";

test("parses Drive storage references", () => {
  assert.deepEqual(parseAudioStorageRef("drive:file-123"), { provider: "drive", fileId: "file-123" });
});

test("parses local storage references without allowing an empty ref", () => {
  assert.deepEqual(parseAudioStorageRef("local:private/audio/song.mp3"), { provider: "local", filePath: "private/audio/song.mp3" });
  assert.equal(parseAudioStorageRef("drive:"), null);
  assert.equal(hasStoredAudio(null), false);
});

test("uses MP3 for jukebox audio and WAV for paid downloads", () => {
  assert.equal(audioContentType("preview"), "audio/mpeg");
  assert.equal(audioContentType("stream"), "audio/mpeg");
  assert.equal(audioContentType("download"), "audio/wav");
});

test("builds a safe WAV download filename", () => {
  assert.equal(audioDownloadName("What A Shame!?"), "What-A-Shame.wav");
});
''')
write('src/lib/audio-storage.ts', r'''import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { google } from "googleapis";
import { audioContentType, parseAudioStorageRef, type AudioAssetKind } from "./audio-paths";

function serviceAccountAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Google Drive audio storage is not configured.");
  return new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/drive.readonly"] });
}

async function driveResponse(fileId: string, range?: string | null) {
  const auth = serviceAccountAuth();
  const token = await auth.authorize();
  if (!token.access_token) throw new Error("Google Drive authentication failed.");
  const headers = new Headers({ Authorization: `Bearer ${token.access_token}` });
  if (range) headers.set("Range", range);
  return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, { headers, cache: "no-store" });
}

async function localResponse(filePath: string, range?: string | null) {
  const root = process.cwd();
  const absolutePath = path.resolve(root, filePath);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) throw new Error("Invalid local audio path.");
  const info = await stat(absolutePath);
  const file = await readFile(absolutePath);
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
      if (start >= info.size || end < start) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      const chunk = file.subarray(start, end + 1);
      return new Response(chunk, { status: 206, headers: { "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": String(chunk.length) } });
    }
  }
  return new Response(file, { headers: { "Accept-Ranges": "bytes", "Content-Length": String(file.length) } });
}

async function openAudioStorageRef(value: string | null | undefined, range?: string | null) {
  const ref = parseAudioStorageRef(value);
  if (!ref) return null;
  return ref.provider === "drive" ? driveResponse(ref.fileId, range) : localResponse(ref.filePath, range);
}

export async function proxyAudioAsset({ storageRef, kind, range, downloadName }: { storageRef: string | null | undefined; kind: AudioAssetKind; range?: string | null; downloadName?: string; }) {
  const source = await openAudioStorageRef(storageRef, range);
  if (!source) return null;
  if (!source.ok && source.status !== 206) throw new Error(`Audio storage returned ${source.status}.`);
  const headers = new Headers({ "Content-Type": audioContentType(kind), "Cache-Control": kind === "preview" ? "public, max-age=300, s-maxage=86400" : "private, no-store" });
  for (const name of ["accept-ranges", "content-length", "content-range"]) { const value = source.headers.get(name); if (value) headers.set(name, value); }
  if (downloadName) headers.set("Content-Disposition", `attachment; filename="${downloadName}"`);
  return new Response(source.body, { status: source.status, headers });
}
''')
write('src/app/api/preview/[slug]/route.ts', r'''import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { proxyAudioAsset } from "@/lib/audio-storage";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const song = await prisma.song.findUnique({ where: { slug } });
  if (!song?.isPublic || !song.previewPath) return NextResponse.json({ error: "Preview unavailable" }, { status: 404 });
  try { return await proxyAudioAsset({ storageRef: song.previewPath, kind: "preview", range: request.headers.get("range") }) || NextResponse.json({ error: "Preview unavailable" }, { status: 404 }); }
  catch (error) { console.error("Preview storage failure", { slug, error }); return NextResponse.json({ error: "Preview storage is not configured" }, { status: 503 }); }
}
''')
write('src/app/api/audio/[slug]/route.ts', r'''import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId, verifyPlayToken } from "@/lib/jukebox-access";
import { proxyAudioAsset } from "@/lib/audio-storage";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const visitorId = await getVisitorId();
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!visitorId || !verifyPlayToken(token, visitorId, slug)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const song = await prisma.song.findUnique({ where: { slug } });
  if (!song?.audioPath) return NextResponse.json({ error: "Audio unavailable" }, { status: 404 });
  try { return await proxyAudioAsset({ storageRef: song.audioPath, kind: "stream", range: request.headers.get("range") }) || NextResponse.json({ error: "Audio unavailable" }, { status: 404 }); }
  catch (error) { console.error("Full audio storage failure", { slug, error }); return NextResponse.json({ error: "Full audio storage is not configured" }, { status: 503 }); }
}
''')
write('src/app/api/download/[slug]/route.ts', r'''import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId } from "@/lib/jukebox-access";
import { audioDownloadName } from "@/lib/audio-paths";
import { proxyAudioAsset } from "@/lib/audio-storage";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const visitorId = await getVisitorId();
  if (!visitorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const song = await prisma.song.findUnique({ where: { slug } });
  if (!song?.downloadPath) return NextResponse.json({ error: "WAV master unavailable" }, { status: 404 });
  const purchase = await prisma.songPurchase.findUnique({ where: { visitorId_songId: { visitorId, songId: song.id } } });
  if (!purchase) return NextResponse.json({ error: "Purchase required" }, { status: 403 });
  try { return await proxyAudioAsset({ storageRef: song.downloadPath, kind: "download", range: request.headers.get("range"), downloadName: audioDownloadName(slug) }) || NextResponse.json({ error: "WAV master unavailable" }, { status: 404 }); }
  catch (error) { console.error("WAV download storage failure", { slug, error }); return NextResponse.json({ error: "WAV download storage is not configured" }, { status: 503 }); }
}
''')
replace('src/app/page.tsx','        previewUrl: song.previewUrl,\n        downloadPriceCents: song.downloadPriceCents,','        previewUrl: song.previewPath && song.slug ? `/api/preview/${encodeURIComponent(song.slug)}` : song.previewUrl,\n        downloadAvailable: Boolean(song.downloadPath),\n        downloadPriceCents: song.downloadPriceCents,')
replace('src/app/api/songs/route.ts','    previewUrl: song.previewUrl,\n    downloadPriceCents: song.downloadPriceCents,','    previewUrl: song.previewPath && song.slug ? `/api/preview/${encodeURIComponent(song.slug)}` : song.previewUrl,\n    downloadAvailable: Boolean(song.downloadPath),\n    downloadPriceCents: song.downloadPriceCents,')
replace('src/app/api/songs/route.ts','"durationSeconds", "audioUrl", "previewUrl", "audioPath", "downloadPriceCents", "lyricsText", "chordsText",','"durationSeconds", "audioUrl", "previewUrl", "previewPath", "audioPath", "downloadPath", "downloadPriceCents", "lyricsText", "chordsText",')
replace('src/app/api/songs/[id]/play/route.ts','    audioUrl: mode === "preview"\n      ? song.previewUrl\n      : `/api/audio/${encodeURIComponent(song.slug)}?token=${encodeURIComponent(createPlayToken(visitorId, song.slug))}`,\n    downloadUrl: purchase ? `/api/download/${encodeURIComponent(song.slug)}` : null,','    audioUrl: mode === "preview"\n      ? (song.previewPath ? `/api/preview/${encodeURIComponent(song.slug)}` : song.previewUrl)\n      : `/api/audio/${encodeURIComponent(song.slug)}?token=${encodeURIComponent(createPlayToken(visitorId, song.slug))}`,\n    downloadUrl: purchase && song.downloadPath ? `/api/download/${encodeURIComponent(song.slug)}` : null,')
replace('src/app/api/checkout/route.ts','    if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });\n    amountCents = song.downloadPriceCents || 200;\n    label = `${song.title} — MP3 download`;\n    metadata = { type, visitorId, songId: song.id, songSlug: song.slug || "" };','    if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });\n    if (!song.downloadPath) return NextResponse.json({ error: "A WAV master is not available for this song yet." }, { status: 409 });\n    amountCents = song.downloadPriceCents || 200;\n    label = `${song.title} — WAV download`;\n    metadata = { type, visitorId, songId: song.id, songSlug: song.slug || "", format: "wav" };')
replace('src/app/api/checkout/route.ts','        product_data: { name: label },','        product_data: { name: label, metadata },')
replace('src/app/api/checkout/route.ts','    cancel_url: `${site}/?canceled=1`,\n    metadata\n  });','    cancel_url: `${site}/?canceled=1`,\n    metadata,\n    payment_intent_data: { metadata }\n  });')
replace('src/app/site-shell.tsx','  downloadPriceCents: number;\n  minTipCents: number;','  downloadAvailable: boolean;\n  downloadPriceCents: number;\n  minTipCents: number;')
replace('src/app/site-shell.tsx','unlimited full plays and download unlocked.','unlimited full MP3 plays and WAV download unlocked.')
replace('src/app/site-shell.tsx','Own the MP3 for $2 and unlock unlimited full playback plus download.','Own the WAV master for $2 and unlock unlimited full MP3 playback plus the WAV download.')
replace('src/app/site-shell.tsx','After that: 30-second previews, or buy the MP3 for $2.','After that: 30-second MP3 previews. Songs with a WAV master can be purchased for $2.')
replace('src/app/site-shell.tsx','                <button className="button" onClick={() => buySong(currentSong)}>Buy MP3 · ${(currentSong.downloadPriceCents / 100).toFixed(2)}</button>\n                {currentSong.previewUrl && <button className="button secondary" onClick={() => playPreview(currentSong)}>30-sec preview</button>}\n                {downloadUrls[currentSong.id] && <a className="button secondary" href={downloadUrls[currentSong.id]}>Download purchased MP3</a>}','                {currentSong.downloadAvailable && <button className="button" onClick={() => buySong(currentSong)}>Buy WAV · ${(currentSong.downloadPriceCents / 100).toFixed(2)}</button>}\n                {currentSong.previewUrl && <button className="button secondary" onClick={() => playPreview(currentSong)}>30-sec MP3 preview</button>}\n                {downloadUrls[currentSong.id] && <a className="button secondary" href={downloadUrls[currentSong.id]}>Download purchased WAV</a>}\n                {!currentSong.downloadAvailable && <span className="muted">WAV master not available for purchase yet.</span>}')
replace('src/app/site-shell.tsx','<p>{currentSong.title} is now limited to a 30-second preview on this browser. Buy the MP3 for $2 to unlock unlimited full playback and download.</p>\n            <div className="actions">\n              <button className="button" onClick={() => buySong(currentSong)}>Buy & download · $2</button>\n              <button className="button secondary" onClick={() => playPreview(currentSong)}>Play 30-sec preview</button>','<p>{currentSong.title} is now limited to a 30-second MP3 preview on this browser. {currentSong.downloadAvailable ? "Buy the WAV master for $2 to unlock unlimited full MP3 playback and the WAV download." : "A WAV master is not available for purchase yet."}</p>\n            <div className="actions">\n              {currentSong.downloadAvailable && <button className="button" onClick={() => buySong(currentSong)}>Buy WAV · $2</button>}\n              <button className="button secondary" onClick={() => playPreview(currentSong)}>Play 30-sec MP3 preview</button>')

tracks = [
("one-question","One Question","SINGLE",191.832,"162rImHOyGBG56IDm09c4kmGD7YK7Az5g","1GqrqZr9XV5VzebGrkXvCygtGfM51oN_-",None),
("what-a-shame","What a Shame","SINGLE",226.586122,"1nvZxaGxgWlGx0rE9zpFl2PnU1TKH2yGO","1Hsoe_GjwqHbvzqjGsLZFeiulk8dxa1oZ","1g_qmOKLhyjWrF4hOjxbGkFQWtKhIrjAd"),
("evangelina","Evangelina","SINGLE",210.90907,"1_p3LOhDc9bxbFp8rkEwHvOK8kkAOtBsE","1yZQDaRWpYYqiSnhjb4Yz4zIW9rXsJ4_K","15wRGzORB1iSNBeRcbTJ5wH-H37cNg5oK"),
("grass-before-the-sickle","Grass Before the Sickle","SINGLE",215.818833,"15-0tR4NFNzTIcRuyX1PPnSTr6IQefZJQ","1-CqGa89M3jKd0kO62UL1c-JZd1OgoWVk",None),
("light-under-the-moon","Light Under the Moon","SINGLE",149.5562,"1biHUaQoByxMi6pRGxRQrQuAk-Gf0T1H1","1zdbyXvbMad3Epz5AzxTS5CUSwr_gZ__H",None),
("need-the-cage","Need the Cage","SINGLE",219.39225,"1zAznUKHUPcgxHmUPASFOH_LtVQ0ajkPx","1Ibkne0VeMjpT4zn_ghDlTIDzvjXox4NP",None),
("nose-to-the-grindstone","Nose to the Grindstone","A Taste for Crow",177.998367,"1fKeNu7-N4pmxVIWQU4gsWMvJxMvwvOpM","1uHrAcewhD9jHdw1DEDfOafq-rPMnEX-p","1pHfbizbzWEsS44jtmQlm-7BaE4QPuTSx"),
("old-macdonald","Old MacDonald","SINGLE",178.222268,"153ACXVge_UQIUak4-xP3vSC-Niosemgq","11AGkG0mNnmJE8ZlAjvTQ9lxkZBiQ8A8b",None),
("slow-dive","Slow Dive","SINGLE",135.604535,"1QWo15gqL9Oc7SVptLwme74pqpRnsCpAy","1qGOL2-t9-cB8pkY1sPHCJKJIUi8Obasz",None),
("the-seed","The Seed","SINGLE",209.454542,"1BRBLPQHhptVgynMhM4YWarXCbySZm-pN","1o1KVd1dnNYhlWFGbqoo0DB6Ed_Fjht3X","1atptgshRyyaFuncfX5NVOxwl4mfH1HnR"),
("white-house-road","White House Road","SINGLE",254.112698,"1CQUNLxI1ztM7DXxi0_uDrcKHEInzIPu2","1Qp5b7JHGJ08z5c_xgGx6sAMN1ugObWhY","1YVHykQxk-iAJZqHDyBHpOslrFu7mpTii"),
("who-did-that-to-you","Who Did That to You?","SINGLE",255.272729,"1AhBPOKuDCMZlBBXF8hPiYzyU234rKO8S","1-UlE3uiyPsSHbr_KPQIMlGZbDLp_eTSj","1Ei6pWcOYsEvS-BQIe7F6h6pxtdM2zDWR"),
("this-song-is-about-you","This Song Is About You","SINGLE",221.466122,"1RPJEPB_-bIETh4MowwhKAsk17OP7lLOo","1pLtc8b2aTWN7Bhs_ysomfYcwjmPrTjKD","1O5eMTO6mzXJbnoCyMgkrx9Um5lYvdRDD"),
("damnit-just-you-hold-on","Damnit, Just You Hold On","SINGLE",159.111837,"15VCzYOg0gRzh8hVvbpq27p2dCBgNslB","1DNZ7DrwW4BuNJ6cmPDjcvbJGvB4vp5Kx","1PGOoSiDY3Pv45kr8IQlvNbqJMIR0kSNN"),
("get-in-loser","Get in Loser","SINGLE",257.044898,"18RVc0H_Q3xirCVu6QtybvSV2fRKxGI6Z","1lpMNCrg7jJrvxTuyDHfyGqKsjHvEh6pw","1a-sLTx3shFvj68RFlatOLnZ2apTj5MKV"),
("and-another-thing-screams","And Another Thing — Screams","SINGLE",189.44,"1NEaq-AUwk7HADau8OLhP_j1dSY5ZtZMu","1nsxTpMjYnh0wgL4ZLZtqCU1bQG_SxsDs","1YU5zdlvgd6xZKMnMcwcNzJu6NC5qO-Cp")]
seed_entries=[{"slug":s,"title":t,"album":a,"durationSeconds":d,"previewPath":f"drive:{p}","audioPath":f"drive:{m}","downloadPath":f"drive:{w}" if w else None} for s,t,a,d,p,m,w in tracks]
write('prisma/seed-live-audio.ts','import { PrismaClient } from "@prisma/client";\n\nconst prisma = new PrismaClient();\n\nconst tracks = '+json.dumps(seed_entries,indent=2)+' as const;\n\nasync function main() {\n  for (const track of tracks) {\n    const data = { ...track, artist: "George Grissom", previewUrl: null, audioUrl: null, downloadPriceCents: 200, requestable: true, publicShortlist: true, paidCatalog: true, minTipCents: 0, freePlayLimit: 3, isPublic: true };\n    await prisma.song.upsert({ where: { slug: track.slug }, update: data, create: data });\n  }\n}\nmain().finally(async () => { await prisma.$disconnect(); });\n')
manifest={"updatedAt":"2026-09-04T06:40:00-07:00","storage":{"provider":"Google Drive via service account proxy","mp3FolderId":"1ifbOJinjg0dxSpkexdrbwh7-0eSylNTt","wavFolderId":"1S6L1NPHhZvF0mvK8_KLFFaLleYB8BTl7","rules":{"preview":"30-second MP3 through /api/preview/:slug","fullPlayback":"protected full MP3 through /api/audio/:slug","purchaseDownload":"protected WAV through /api/download/:slug"}},"tracks":[{"slug":s,"title":t,"artist":"George Grissom","album":a,"durationSeconds":d,"preview":{"format":"audio/mpeg","fileName":f"{s}-preview.mp3","driveFileId":p},"fullPlayback":{"format":"audio/mpeg","fileName":f"{s}.mp3","driveFileId":m},"download":{"format":"audio/wav","fileName":f"{s}.wav","driveFileId":w} if w else None} for s,t,a,d,p,m,w in tracks]}
write('docs/audio-assets.json',json.dumps(manifest,indent=2)+'\n')
write('docs/media-assets.json',json.dumps({"updatedAt":"2026-09-04T06:40:00-07:00","assets":[{"id":"GG1","intendedFileName":"GG1-thumbnail.webp","status":"reserved-not-present-in-current-main","source":None,"mediaType":"image/webp","siteUsage":"future performance-media thumbnail","description":"Sequence reservation retained from the prior media task; no verified matching binary exists in current main."},{"id":"GG2","intendedFileName":"GG2-artwork.webp","status":"reserved-not-present-in-current-main","source":None,"mediaType":"image/webp","siteUsage":"future performance artwork","description":"Sequence reservation retained from the prior media task; no verified matching binary exists in current main."},{"id":"GG3","localFileName":"public/images/reference-jukebox.png","originalFileName":"reference-jukebox.png","source":"repository asset","mediaType":"image/png","siteUsage":"graphical jukebox player","description":"Existing supplied chrome-and-glass jukebox artwork used by the live player."}]},indent=2)+'\n')
write('docs/superpowers/plans/2026-09-04-finish-george-grissom-live.md','# George Grissom Live Completion Implementation Plan\n\n> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.\n\n**Goal:** Complete the responsive jukebox, separate MP3 playback from WAV downloads, preserve Stripe entitlements, and deploy through the existing GitHub/Vercel project.\n\n**Architecture:** Song records carry three independent storage references: preview MP3, protected full MP3, and protected WAV. Next.js route handlers proxy owner-only Google Drive files with the existing service-account credentials. Checkout is offered only when a true WAV master exists.\n\n**Tech Stack:** Next.js 15 App Router, React 18, Prisma/PostgreSQL, Stripe Checkout, Google Drive API, Vercel, GitHub Actions.\n\n**Spec:** User-approved takeover requirements in PR #3.\n\n## Global Constraints\n- Preserve the existing design, jukebox artwork, navigation, booking, cart, Stripe, and responsive hierarchy.\n- `main` remains authoritative; work occurs on `agent/finish-george-grissom-live`.\n- MP3 assets are for preview/full jukebox playback; WAV assets are the only paid downloads.\n- Never advertise or sell a WAV where no true WAV master exists.\n- Never expose private Drive IDs in the public API shape.\n\n## Tasks\n- [x] Add deterministic title-fitting utility and ResizeObserver integration.\n- [x] Normalize and organize 16 full MP3 streams, 16 MP3 previews, and 10 true WAV masters.\n- [x] Add Drive-backed proxy routes with play-token and purchase entitlement checks.\n- [x] Update Prisma schema and 16-song seed map.\n- [x] Change Stripe checkout and public copy from MP3 download to WAV download.\n- [x] Remove the expired one-time import workflow and destructive schema flag.\n- [ ] Share the MP3/WAV Drive folders with the deployed Google service-account email.\n- [ ] Verify preview playback, three-play transition, Stripe checkout, WAV download, and responsive title fitting in the Vercel preview.\n- [ ] Merge PR #3 and verify canonical production domains.\n')
expired=ROOT/'.github/workflows/import-jukebox-assets-once.yml'
if expired.exists(): expired.unlink()
