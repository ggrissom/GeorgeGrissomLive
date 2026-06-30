type ProposedSong = {
  title: string;
  artist?: string;
  composer?: string;
  genre?: string;
  mood?: string;
  tempoLabel?: string;
  bpm?: number;
  songKey?: string;
  lyricsText?: string;
  chordsText?: string;
  privateRehearsalNotes?: string;
  privateLyricsNotes?: string;
  privateChordNotes?: string;
  requestable: boolean;
  publicShortlist: boolean;
  paidCatalog: boolean;
  minTipCents: number;
  confidenceScore: number;
  warnings: string[];
};

const titleKeys = ["title", "song", "song title", "name"];
const artistKeys = ["artist", "original artist", "performer", "singer", "band"];
const genreKeys = ["genre", "style"];
const keyKeys = ["key", "song key"];
const bpmKeys = ["bpm", "tempo"];

export async function normalizeSongRow(rawText: string, cells?: Record<string, string>): Promise<ProposedSong> {
  if (process.env.OPENAI_API_KEY) {
    const ai = await normalizeWithOpenAI(rawText, cells).catch(() => null);
    if (ai) return ai;
  }
  return normalizeHeuristic(rawText, cells);
}

function pick(cells: Record<string, string> | undefined, keys: string[]) {
  if (!cells) return undefined;
  const entries = Object.entries(cells);
  for (const key of keys) {
    const hit = entries.find(([k]) => k.trim().toLowerCase() === key);
    if (hit?.[1]) return hit[1];
  }
  const loose = entries.find(([k]) => keys.some(key => k.trim().toLowerCase().includes(key)));
  return loose?.[1] || undefined;
}

function normalizeHeuristic(rawText: string, cells?: Record<string, string>): ProposedSong {
  const titleFromCell = pick(cells, titleKeys);
  const artistFromCell = pick(cells, artistKeys);
  const genre = pick(cells, genreKeys);
  const songKey = pick(cells, keyKeys);
  const bpmText = pick(cells, bpmKeys);
  const bpm = bpmText ? Number.parseInt(bpmText, 10) : undefined;

  let title = titleFromCell;
  let artist = artistFromCell;
  if (!title) {
    const parts = rawText.split(/\s+[-–—|]\s+/);
    title = parts[0]?.trim() || "Untitled Song";
    if (!artist && parts[1]) artist = parts[1].trim();
  }

  const warnings: string[] = [];
  if (!artist) warnings.push("Artist missing; use search/enrichment or edit manually.");
  if (!songKey) warnings.push("Key missing; AI/search may suggest but admin should verify.");
  if (!bpm) warnings.push("BPM missing; admin should verify tempo.");

  return {
    title: title || "Untitled Song",
    artist,
    genre,
    songKey,
    bpm: Number.isFinite(bpm) ? bpm : undefined,
    tempoLabel: bpm ? bpmToLabel(bpm) : "unknown",
    requestable: true,
    publicShortlist: false,
    paidCatalog: true,
    minTipCents: 25,
    confidenceScore: titleFromCell ? 0.78 : 0.45,
    warnings
  };
}

function bpmToLabel(bpm?: number) {
  if (!bpm) return "unknown";
  if (bpm < 80) return "slow";
  if (bpm > 130) return "fast";
  return "medium";
}

async function normalizeWithOpenAI(rawText: string, cells?: Record<string, string>): Promise<ProposedSong | null> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      artist: { type: ["string", "null"] },
      composer: { type: ["string", "null"] },
      genre: { type: ["string", "null"] },
      mood: { type: ["string", "null"] },
      tempoLabel: { type: "string", enum: ["slow", "medium", "fast", "unknown"] },
      bpm: { type: ["number", "null"] },
      songKey: { type: ["string", "null"] },
      privateRehearsalNotes: { type: ["string", "null"] },
      privateLyricsNotes: { type: ["string", "null"] },
      privateChordNotes: { type: ["string", "null"] },
      requestable: { type: "boolean" },
      publicShortlist: { type: "boolean" },
      paidCatalog: { type: "boolean" },
      minTipCents: { type: "number" },
      confidenceScore: { type: "number" },
      warnings: { type: "array", items: { type: "string" } }
    },
    required: ["title", "artist", "composer", "genre", "mood", "tempoLabel", "bpm", "songKey", "privateRehearsalNotes", "privateLyricsNotes", "privateChordNotes", "requestable", "publicShortlist", "paidCatalog", "minTipCents", "confidenceScore", "warnings"]
  };

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: "Normalize a song catalog row for a private performer web app. Do not invent copyrighted lyrics. Put pasted lyrics/chords only into private notes. If uncertain, add warnings."
      },
      {
        role: "user",
        content: JSON.stringify({ rawText, cells }, null, 2)
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "song_catalog_row",
        strict: true,
        schema
      }
    }
  });

  const output = response.output_text;
  if (!output) return null;
  const parsed = JSON.parse(output) as ProposedSong;
  return {
    ...parsed,
    artist: parsed.artist || undefined,
    composer: parsed.composer || undefined,
    genre: parsed.genre || undefined,
    mood: parsed.mood || undefined,
    bpm: parsed.bpm || undefined,
    songKey: parsed.songKey || undefined,
    minTipCents: parsed.minTipCents || 25,
    confidenceScore: parsed.confidenceScore || 0.5,
    warnings: parsed.warnings || []
  };
}
