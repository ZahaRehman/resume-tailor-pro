import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useResume } from "@/context/ResumeContext";
import { supabase } from "@/integrations/supabase/client";
import { ResumeTemplate } from "./ResumeTemplate";
import { EditableResumeView } from "./EditableResumeView";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export function PreviewTab() {
  const {
    masterResume, tailoredResume,
    activeView, setActiveView,
    setTailoredResume, setMasterResume, saveMaster,
    isUpdatingSection, setIsUpdatingSection,
  } = useResume();

  const [instruction, setInstruction] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const current = activeView === "tailored" ? tailoredResume : masterResume;

  const onApply = async () => {
    if (!current || !instruction.trim()) return;
    setIsUpdatingSection(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-section", {
        body: { resume: current, instruction },
      });
      if (error) throw error;
      if (!data?.updated) throw new Error("No updated result returned");

      if (activeView === "tailored") {
        setTailoredResume(data.updated);
      } else {
        setMasterResume(data.updated);
        await saveMaster(data.updated);
      }
      setInstruction("");
      toast.success("Updated ✓");
    } catch (e: unknown) {
      toast.error("Section update failed. Please try again.");
      console.error(e);
    } finally {
      setIsUpdatingSection(false);
    }
  };

  const onPrint = () => {
    if (!current) return;
    const html = buildPrintHtml(current);
    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w) {
      toast.error("Popup blocked — please allow popups for this site.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const onDownloadPdf = async () => {
    if (!current) return;
    setIsDownloading(true);
    // Render the resume offscreen with no padding; we control margins via jsPDF.
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.width = "7.5in"; // letter (8.5in) minus 0.5in margin each side
    host.style.background = "#fff";
    document.body.appendChild(host);
    const root = createRoot(host);
    try {
      await new Promise<void>((resolve) => {
        // printMode=false keeps internal padding off; we wrap with our own padding via host width.
        root.render(
          <div style={{ padding: 0, background: "#fff" }}>
            <ResumeTemplate resume={current} printMode />
          </div>
        );
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const target = host.firstElementChild as HTMLElement;
      const blocks = Array.from(
        target.querySelectorAll<HTMLElement>("[data-pdf-block]")
      );
      if (blocks.length === 0) throw new Error("No PDF blocks found");

      // Capture every block individually
      const captured: { canvas: HTMLCanvasElement; keepWithNext: boolean }[] = [];
      for (const el of blocks) {
        const c = await html2canvas(el, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          windowWidth: el.scrollWidth,
        });
        captured.push({
          canvas: c,
          keepWithNext: el.getAttribute("data-pdf-keep-with-next") === "1",
        });
      }

      const pdf = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 36; // 0.5in
      const contentW = pageW - margin * 2;
      const contentH = pageH - margin * 2;
      const blockGap = 2;

      let cursorY = margin;

      const heightOf = (c: HTMLCanvasElement) => (c.height * contentW) / c.width;

      for (let i = 0; i < captured.length; i++) {
        const { canvas, keepWithNext } = captured[i];
        const h = heightOf(canvas);

        // Group with next block(s) if keepWithNext: ensure heading + first item fit together
        let groupHeight = h;
        let j = i;
        while (captured[j].keepWithNext && j + 1 < captured.length) {
          j++;
          groupHeight += heightOf(captured[j].canvas) + blockGap;
        }

        const remaining = pageH - margin - cursorY;
        if (groupHeight > remaining && cursorY > margin) {
          pdf.addPage();
          cursorY = margin;
        }

        // If a single block is taller than a full page, slice it across pages.
        if (h > contentH) {
          const pxPerPt = canvas.width / contentW;
          const pageHeightPx = (pageH - margin - cursorY) * pxPerPt;
          let renderedPx = 0;
          let firstSlice = true;
          const slice = document.createElement("canvas");
          const ctx = slice.getContext("2d")!;
          slice.width = canvas.width;
          while (renderedPx < canvas.height) {
            const availPt = firstSlice ? pageH - margin - cursorY : contentH;
            const availPx = Math.floor(availPt * pxPerPt);
            const sliceH = Math.min(availPx, canvas.height - renderedPx);
            slice.height = sliceH;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, slice.width, slice.height);
            ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
            const data = slice.toDataURL("image/jpeg", 0.95);
            const drawH = (sliceH * contentW) / canvas.width;
            pdf.addImage(data, "JPEG", margin, firstSlice ? cursorY : margin, contentW, drawH);
            renderedPx += sliceH;
            if (renderedPx < canvas.height) {
              pdf.addPage();
              cursorY = margin;
              firstSlice = false;
            } else {
              cursorY = (firstSlice ? cursorY : margin) + drawH + blockGap;
            }
          }
        } else {
          const data = canvas.toDataURL("image/jpeg", 0.95);
          pdf.addImage(data, "JPEG", margin, cursorY, contentW, h);
          cursorY += h + blockGap;
        }
      }

      const fname = `${(current.name || "resume").replace(/\s+/g, "_")}_${activeView}.pdf`;
      pdf.save(fname);
      toast.success("PDF downloaded ✓");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      root.unmount();
      host.remove();
      setIsDownloading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-6">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Viewing
          </div>
          <div className="inline-flex rounded-md border border-border bg-white p-0.5">
            <button
              onClick={() => setActiveView("master")}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                activeView === "master" ? "bg-indigo-600 text-white" : "text-foreground"
              }`}
            >
              Master
            </button>
            <button
              onClick={() => tailoredResume && setActiveView("tailored")}
              disabled={!tailoredResume}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                activeView === "tailored" ? "bg-indigo-600 text-white" : "text-foreground"
              } disabled:cursor-not-allowed disabled:text-gray-400`}
            >
              Tailored
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {activeView === "master"
              ? "Showing the saved master resume."
              : "Showing the AI-tailored resume."}
          </p>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Refine a section
          </div>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={`"Make summary more AI-focused"\n"Move Kafka to top of skills"\n"Shorten the REA project to 2 bullets"\n"Add Langchain to skills"`}
            className="min-h-[140px] w-full resize-y rounded-md border border-border bg-white p-3 text-sm outline-none focus:border-indigo-500"
          />
          <button
            onClick={onApply}
            disabled={!instruction.trim() || isUpdatingSection || !current}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isUpdatingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Apply Changes
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={onDownloadPdf}
            disabled={!current || isDownloading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isDownloading ? "Generating PDF…" : "Download PDF"}
          </button>
          <button
            onClick={onPrint}
            disabled={!current}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            Print / Save via browser
          </button>
        </div>
      </aside>

      <div className="overflow-auto rounded-lg border border-border bg-white shadow-sm">
        {current ? (
          <EditableResumeView
            resume={current}
            onSave={async (updated) => {
              try {
                if (activeView === "tailored") {
                  setTailoredResume(updated);
                } else {
                  setMasterResume(updated);
                  await saveMaster(updated);
                }
                toast.success("Saved ✓");
              } catch (e) {
                console.error(e);
                toast.error("Failed to save changes");
                throw e;
              }
            }}
          />
        ) : (
          <div className="p-12 text-center text-sm text-muted-foreground">No resume loaded.</div>
        )}
      </div>
    </div>
  );
}

function buildPrintHtml(resume: import("@/types/resume").ResumeData): string {
  const linkS = 'style="color:#1155cc;text-decoration:none"';
  const sec = (t: string) =>
    `<h2 style="margin:13px 0 6px 0;font-size:13px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#000;border-bottom:1.5px solid #000;padding-bottom:2px">${t}</h2>`;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const skillsRows = Array.from({ length: Math.ceil(resume.skills.length / 4) })
    .map((_, r) => {
      const cells = [0, 1, 2, 3]
        .map((c) => {
          const s = resume.skills[r * 4 + c];
          return `<td style="width:25%;padding:2px 4px;vertical-align:top">${
            s ? `<span style="margin-right:6px">●</span>${esc(s)}` : ""
          }</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const expHtml = resume.experience
    .map(
      (e) => `
      <div style="margin-bottom:8px">
        <table style="width:100%;border-collapse:collapse"><tbody><tr>
          <td style="font-size:11.5px;font-weight:700;color:#000">${esc(e.role)}</td>
          <td style="font-size:10.5px;font-style:italic;text-align:right">${esc(e.duration)}</td>
        </tr></tbody></table>
        <div style="font-size:10.8px;font-style:italic">${esc(e.company)}</div>
        <ul style="margin:4px 0 0 0;padding-left:20px">
          ${e.bullets.map((b) => `<li style="margin-bottom:2px">${esc(b)}</li>`).join("")}
        </ul>
      </div>`
    )
    .join("");

  const projHtml = resume.projects
    .map(
      (p) => `
      <div style="margin-bottom:8px">
        <div style="font-size:11.5px;font-weight:700;color:#000">${esc(p.name)}</div>
        <ul style="margin:4px 0 0 0;padding-left:20px">
          ${p.bullets.map((b) => `<li style="margin-bottom:2px">${esc(b)}</li>`).join("")}
        </ul>
      </div>`
    )
    .join("");

  const eduHtml = resume.education
    .map(
      (e) => `
      <div style="margin-bottom:6px">
        <table style="width:100%;border-collapse:collapse"><tbody><tr>
          <td style="font-weight:700;color:#000">${esc(e.institution)}</td>
          <td style="font-style:italic;text-align:right">${esc(e.duration)}</td>
        </tr></tbody></table>
        <div style="font-style:italic">${esc(e.degree)}${e.gpa ? ` — CGPA: ${esc(e.gpa)}` : ""}</div>
      </div>`
    )
    .join("");

  const addlHtml = resume.additionalSkills
    .map(
      (a) => `
      <div style="margin-bottom:6px">
        <div style="font-weight:700;color:#000">${esc(a.title)}</div>
        <div>${esc(a.description)}</div>
      </div>`
    )
    .join("");

  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>${esc(resume.name)} — Resume</title>
<style>
  @page { size: letter; margin: 0.5in; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 10.8px; line-height: 1.45; color: #111; }
  a { color: #1155cc; text-decoration: none; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
  <h1 style="text-align:center;font-size:22px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px 0;color:#000">${esc(
    resume.name
  )}</h1>
  <table style="width:100%;border-collapse:collapse;font-size:10.5px"><tbody>
    <tr>
      <td style="width:33%;text-align:left;padding:1px 0">${esc(resume.contact.location)}</td>
      <td style="width:34%;text-align:center;padding:1px 0">LinkedIn: <a href="https://${esc(
        resume.contact.linkedin
      )}" ${linkS}>${esc(resume.contact.linkedin)}</a></td>
      <td style="width:33%;text-align:right;padding:1px 0"></td>
    </tr>
    <tr>
      <td style="text-align:left;padding:1px 0">Contact: ${esc(resume.contact.phone)}</td>
      <td style="text-align:center;padding:1px 0">GitHub: <a href="https://${esc(
        resume.contact.github
      )}" ${linkS}>${esc(resume.contact.github)}</a></td>
      <td style="text-align:right;padding:1px 0">Email: <a href="mailto:${esc(
        resume.contact.email
      )}" ${linkS}>${esc(resume.contact.email)}</a></td>
    </tr>
  </tbody></table>
  <div style="border-top:1.5px solid #000;margin-top:4px"></div>

  ${sec("Professional Summary")}
  <p style="margin:0">${esc(resume.summary)}</p>

  ${sec("Key Skills")}
  <table style="width:100%;border-collapse:collapse"><tbody>${skillsRows}</tbody></table>

  ${sec("Professional Experience")}
  ${expHtml}

  ${sec("Projects")}
  ${projHtml}

  ${sec("Education")}
  ${eduHtml}

  ${sec("Additional Skills & Strengths")}
  ${addlHtml}

  <script>
    window.addEventListener('load', function() {
      setTimeout(function(){ window.print(); }, 600);
    });
  </script>
</body></html>`;
}
