import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

export type ParsedRow = {
  rawText: string;
  cells?: Record<string, string>;
};

export async function parseImportFile(filePath: string, mimeType: string, fileName: string): Promise<ParsedRow[]> {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".csv" || mimeType.includes("csv")) {
    return parseCsv(await fs.readFile(filePath, "utf8"));
  }
  if (ext === ".xlsx" || ext === ".xls" || mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return parseWorkbook(filePath);
  }
  if (ext === ".pdf" || mimeType.includes("pdf")) {
    return parsePdf(filePath);
  }
  if (mimeType.startsWith("text/")) {
    return parseLooseText(await fs.readFile(filePath, "utf8"));
  }
  return [{
    rawText: `Unsupported or binary file type. File saved for manual review: ${fileName}`,
    cells: { title: path.basename(fileName, ext), warnings: "Manual review required" }
  }];
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const cells: Record<string, string> = {};
    headers.forEach((h, i) => cells[h || `column_${i + 1}`] = (values[i] || "").trim());
    return { rawText: line, cells };
  });
}

function splitCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
}

function parseWorkbook(filePath: string): ParsedRow[] {
  const workbook = XLSX.readFile(filePath);
  const rows: ParsedRow[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    for (const row of jsonRows) {
      const cells: Record<string, string> = {};
      Object.entries(row).forEach(([k, v]) => cells[k] = String(v ?? "").trim());
      rows.push({ rawText: `${sheetName}: ${Object.values(cells).join(" | ")}`, cells });
    }
  }
  return rows;
}

async function parsePdf(filePath: string): Promise<ParsedRow[]> {
  try {
    const mod = await import("pdf-parse");
    const data = await mod.default(await fs.readFile(filePath));
    const text = (data.text || "").trim();
    if (!text) {
      return [{
        rawText: "Scanned PDF or image-only PDF detected. Use OpenAI key or copy/paste OCR text into private notes for this MVP.",
        cells: { warnings: "No embedded PDF text found; OCR/manual review required." }
      }];
    }
    return parseLooseText(text);
  } catch (error) {
    return [{
      rawText: `PDF parser failed: ${error instanceof Error ? error.message : "unknown error"}`,
      cells: { warnings: "Manual review required." }
    }];
  }
}

function parseLooseText(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const likelySongLines = lines.filter(line => line.length > 1 && line.length < 180);
  if (likelySongLines.length === 0 && text.trim()) return [{ rawText: text.trim().slice(0, 3000) }];
  return likelySongLines.map(line => ({ rawText: line }));
}
