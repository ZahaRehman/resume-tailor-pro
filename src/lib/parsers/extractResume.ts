// Client-side extraction of resume content from PDF or DOCX files.
// Returns plain text plus structural hints the AI uses to infer layout.

import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker URL import.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export type StructuralHints = {
  source: "pdf" | "docx";
  /** Approximate distinct heading sizes detected (largest first). */
  headingSizes: number[];
  /** Lines the heuristic flagged as section headings (uppercase / large / short). */
  headingCandidates: string[];
  /** Bullet character most commonly used (•, -, *, →, ◆, etc.). */
  bulletChar: string | null;
  /** 1 or 2 column heuristic guess. */
  columnsGuess: 1 | 2;
  /** Page count. */
  pages: number;
};

export type ExtractionResult = {
  rawText: string;
  hints: StructuralHints;
};

const HEADING_HEURISTIC_KEYWORDS = [
  "summary",
  "objective",
  "profile",
  "experience",
  "employment",
  "work history",
  "education",
  "skills",
  "projects",
  "certifications",
  "awards",
  "publications",
  "languages",
  "interests",
  "achievements",
  "volunteer",
  "references",
];

function detectBulletChar(text: string): string | null {
  const candidates = ["•", "●", "◦", "▪", "■", "◆", "→", "▶", "·"];
  for (const c of candidates) {
    if (text.includes(c)) return c;
  }
  // Fallback: lots of lines starting with - or *
  const lines = text.split("\n");
  const dashes = lines.filter((l) => /^\s*-\s+\S/.test(l)).length;
  const stars = lines.filter((l) => /^\s*\*\s+\S/.test(l)).length;
  if (dashes >= 3) return "-";
  if (stars >= 3) return "*";
  return null;
}

function pickHeadingCandidates(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.length > 60) continue;
    const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line);
    const matchesKeyword = HEADING_HEURISTIC_KEYWORDS.some((k) =>
      line.toLowerCase().includes(k),
    );
    if ((isAllCaps && line.length > 3) || matchesKeyword) {
      // Avoid duplicates
      if (!out.includes(line)) out.push(line);
    }
  }
  return out.slice(0, 25);
}

export async function extractFromDocx(file: File): Promise<ExtractionResult> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const rawText = result.value;
  const lines = rawText.split("\n");
  return {
    rawText,
    hints: {
      source: "docx",
      headingSizes: [],
      headingCandidates: pickHeadingCandidates(lines),
      bulletChar: detectBulletChar(rawText),
      columnsGuess: 1,
      pages: 1,
    },
  };
}

export async function extractFromPdf(file: File): Promise<ExtractionResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const allLines: string[] = [];
  const fontSizes: number[] = [];
  const xPositions: number[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    // Group items by approximate y line.
    const items = (textContent.items as any[]).filter((it) => "str" in it);
    const lineMap = new Map<number, { text: string; size: number; x: number }[]>();
    for (const it of items) {
      const transform = it.transform as number[];
      const yKey = Math.round(transform[5]);
      const size = Math.abs(transform[0]) || it.height || 10;
      const x = transform[4];
      fontSizes.push(size);
      xPositions.push(x);
      if (!lineMap.has(yKey)) lineMap.set(yKey, []);
      lineMap.get(yKey)!.push({ text: it.str, size, x });
    }
    // Sort lines by y descending (PDF coords have y from bottom)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const parts = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      const text = parts.map((p) => p.text).join(" ").replace(/\s+/g, " ").trim();
      if (text) allLines.push(text);
    }
    allLines.push(""); // page break marker
  }

  const rawText = allLines.join("\n");

  // Heading sizes: top distinct sizes.
  const sizeCounts = new Map<number, number>();
  for (const s of fontSizes) {
    const r = Math.round(s);
    sizeCounts.set(r, (sizeCounts.get(r) ?? 0) + 1);
  }
  const headingSizes = Array.from(sizeCounts.keys())
    .sort((a, b) => b - a)
    .slice(0, 4);

  // Column guess: if x positions cluster into two distinct bands.
  const minX = Math.min(...xPositions);
  const maxX = Math.max(...xPositions);
  const span = maxX - minX;
  const leftHalf = xPositions.filter((x) => x < minX + span * 0.45).length;
  const rightHalf = xPositions.filter((x) => x > minX + span * 0.55).length;
  const total = xPositions.length || 1;
  const columnsGuess: 1 | 2 =
    leftHalf / total > 0.3 && rightHalf / total > 0.3 ? 2 : 1;

  return {
    rawText,
    hints: {
      source: "pdf",
      headingSizes,
      headingCandidates: pickHeadingCandidates(allLines),
      bulletChar: detectBulletChar(rawText),
      columnsGuess,
      pages: pdf.numPages,
    },
  };
}

export async function extractResumeFile(file: File): Promise<ExtractionResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return extractFromDocx(file);
  if (name.endsWith(".pdf")) return extractFromPdf(file);
  throw new Error("Unsupported file type. Upload a .pdf or .docx file.");
}
