import type { CSSProperties } from "react";
import type { ResumeLayout, SectionKey } from "@/types/resume";

export const DEFAULT_LAYOUT: Required<ResumeLayout> = {
  sectionOrder: [
    "summary",
    "skills",
    "experience",
    "projects",
    "education",
    "additionalSkills",
  ],
  headingStyle: "uppercase",
  headingUnderline: true,
  accentColor: "#000000",
  fontFamily: "sans",
  columns: 1,
  bulletChar: "●",
};

const VALID_SECTIONS: SectionKey[] = [
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
  "additionalSkills",
];

export function withDefaults(l?: ResumeLayout | null): Required<ResumeLayout> {
  const merged = { ...DEFAULT_LAYOUT, ...(l ?? {}) };
  // sanitise sectionOrder: keep only known keys, append any missing at the end
  const order = (merged.sectionOrder ?? []).filter((k): k is SectionKey =>
    VALID_SECTIONS.includes(k as SectionKey),
  );
  for (const k of VALID_SECTIONS) if (!order.includes(k)) order.push(k);
  merged.sectionOrder = order;
  return merged;
}

export function fontStack(f: "serif" | "sans"): string {
  return f === "serif"
    ? 'Georgia, "Times New Roman", Cambria, serif'
    : "Calibri, Arial, Helvetica, sans-serif";
}

export function formatHeadingText(
  text: string,
  style: Required<ResumeLayout>["headingStyle"],
): string {
  if (style === "uppercase") return text.toUpperCase();
  if (style === "title")
    return text.replace(
      /\w\S*/g,
      (w) => w[0].toUpperCase() + w.slice(1).toLowerCase(),
    );
  return text; // smallcaps handled via CSS
}

export function headingCss(layout: Required<ResumeLayout>): CSSProperties {
  return {
    margin: "13px 0 6px 0",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.5px",
    textTransform: layout.headingStyle === "uppercase" ? "uppercase" : "none",
    fontVariant: layout.headingStyle === "smallcaps" ? "small-caps" : "normal",
    color: layout.accentColor,
    borderBottom: layout.headingUnderline
      ? `1.5px solid ${layout.accentColor}`
      : "none",
    paddingBottom: layout.headingUnderline ? 2 : 0,
  };
}

export const SECTION_TITLES: Record<SectionKey, string> = {
  summary: "Professional Summary",
  skills: "Key Skills",
  experience: "Professional Experience",
  projects: "Projects",
  education: "Education",
  additionalSkills: "Additional Skills & Strengths",
};
