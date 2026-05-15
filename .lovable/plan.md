## Goal

Make the app generic: any user uploads their own resume (PDF or DOCX), the system understands both the **content** (name, experience, skills…) and the **visual format** (section order, headings, layout style), and produces an editable template that looks like *their* original — not Zaha's hard-coded one. Tailoring against a JD then works on that user-specific template.

## Can we understand the format?

Yes, with a two-layer approach:

1. **Content extraction** — deterministic, reliable.
   - DOCX: `mammoth` → structured HTML (preserves headings, bold, lists).
   - PDF: `pdfjs-dist` text extraction with positional info (font size, x/y) so we can infer headings vs body, columns, and section order.
2. **Format/structure understanding** — AI-assisted.
   - Feed the extracted text + structural hints (heading sizes, order, whether 1-col or 2-col, bullet style) to Lovable AI (Gemini 2.5 Pro).
   - AI returns **two** JSON objects:
     - `ResumeData` (normalized content — same shape we already use, but flexible/extensible).
     - `ResumeLayout` (section order, heading style: ALL CAPS / Title Case / underlined, accent color guess, font family family — serif/sans, single vs two column, bullet character, contact-line format).
   - This lets us re-render an editable template that visually mirrors the upload.

100% pixel-perfect reproduction of an arbitrary PDF is **not realistic** (fonts, kerning, exact spacing). Realistic target: **structurally faithful** — same sections in same order, same heading treatment, same column layout, same bullet style. That's what recruiters/ATS care about and what the user can then edit.

## Plan

### Phase 1 — Upload + parse infrastructure
1. Add an **Upload** step (new tab or onboarding screen) with a dropzone accepting `.pdf` and `.docx`.
2. Install `mammoth` (DOCX) and `pdfjs-dist` (PDF) on the client. Parse in-browser to avoid round-trips.
3. Build `extractFromDocx(file)` → `{ rawText, htmlBlocks, headingCandidates }`.
4. Build `extractFromPdf(file)` → `{ rawText, lines: [{text, fontSize, x, y, page}] }` and derive `headingCandidates`, `columnCount`, `bulletChar`.

### Phase 2 — AI structuring
5. New server function `parse-resume` (TanStack `createServerFn`, replaces the legacy edge-function pattern for new code) that takes `{ rawText, structuralHints }` and calls Lovable AI Gateway (`google/gemini-2.5-pro`) with a strict prompt to return:
   ```
   { resume: ResumeData, layout: ResumeLayout }
   ```
6. Extend `src/types/resume.ts` with `ResumeLayout` (sectionOrder, headingStyle, accentColor, fontFamily, columns, bulletChar, contactFormat) and make `ResumeData` more flexible (allow custom sections via `extraSections: { title, items }[]`).

### Phase 3 — Dynamic template renderer
7. Refactor `ResumeTemplate.tsx` → driven by `ResumeLayout` props (no hard-coded order/styles). Render sections in `layout.sectionOrder`, apply heading style/accent/font/columns dynamically.
8. Update `EditableResumeView.tsx` to read the same layout so editing UI matches what gets exported.
9. Keep section-based PDF pagination logic intact — it's layout-agnostic.

### Phase 4 — Storage + flow wiring
10. Migration: extend `master_resume` table with a `layout jsonb` column (nullable, defaults to existing built-in layout for backward compatibility with current data).
11. On successful parse → save `{ data, layout }` to `master_resume` and route user to the Master tab to review/edit.
12. Tailor flow: pass `layout` through unchanged; only `data` gets rewritten by the JD tailoring prompt. Layout is preserved across tailoring.

### Phase 5 — UX polish
13. Empty state on Master tab when no resume exists → big "Upload your resume" CTA.
14. Loading states: "Reading file… / Understanding format… / Building your template…".
15. Error handling: unparseable PDF (scanned image), corrupted DOCX → friendly message with option to paste JSON manually (existing JsonEditor as fallback).

## Technical details

- **Libraries**: `mammoth` (~150KB, pure JS), `pdfjs-dist` (uses worker, already common). Both client-side only.
- **Why client-side parse**: avoids uploading user PII to the server unless they tailor; keeps server function small (just AI call with text).
- **Scanned PDFs**: out of scope for v1 — detect zero text extracted and tell user to upload a text-based PDF or DOCX.
- **Backward compat**: existing Zaha resume row keeps working — when `layout` is null, fall back to the current hard-coded layout.
- **No breaking changes to tailor flow**: prompt stays the same, just operates on whatever `ResumeData` shape the user uploaded.

## Out of scope (v1)
- Pixel-perfect font/spacing reproduction.
- Image/photo extraction from resumes.
- Multi-page DOCX with complex tables/text-boxes (best-effort only).
- OCR for scanned PDFs (could add `tesseract.js` later).

## Deliverables
- New Upload tab + parsers (`src/lib/parsers/`).
- New server function `parse-resume.functions.ts`.
- Extended types + dynamic `ResumeTemplate`.
- DB migration for `layout` column.
- Updated context to load/save layout alongside data.
