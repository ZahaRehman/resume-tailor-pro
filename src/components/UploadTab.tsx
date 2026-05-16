import { useRef, useState } from "react";
import { useResume } from "@/context/ResumeContext";
import { supabase } from "@/integrations/supabase/client";
import { extractResumeFile } from "@/lib/parsers/extractResume";
import type { ResumeData, ResumeLayout } from "@/types/resume";
import { toast } from "sonner";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";

const STAGES = [
  "Reading your file…",
  "Understanding the format…",
  "Building your template…",
];

export function UploadTab() {
  const { setMasterResume, setMasterLayout, saveMaster, setActiveTab, setActiveView } = useResume();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setBusy(true);
    setStage(0);
    try {
      // 1) Local extraction
      const { rawText, hints } = await extractResumeFile(file);
      if (!rawText.trim() || rawText.trim().length < 80) {
        throw new Error(
          "We couldn't read text from that file. If it's a scanned PDF, please upload a text-based PDF or a .docx instead.",
        );
      }
      setStage(1);

      // 2) AI parse
      const { data, error } = await supabase.functions.invoke("parse-resume", {
        body: { rawText, hints },
      });
      if (error) throw error;
      const resume: ResumeData | undefined = data?.resume;
      const layout: ResumeLayout | undefined = data?.layout;
      if (!resume || !resume.name) {
        throw new Error("AI couldn't structure that resume. Try a cleaner copy.");
      }

      setStage(2);

      // 3) Persist + activate — keep the layout the AI inferred from the file
      setMasterResume(resume);
      setMasterLayout(layout ?? null);
      await saveMaster(resume, layout ?? null);

      toast.success("Resume imported ✓");
      setActiveView("master");
      setActiveTab("master");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Upload failed.";
      toast.error(msg);
    } finally {
      setBusy(false);
      setStage(0);
    }
  };

  const onPick = () => fileRef.current?.click();

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (busy) return;
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`flex min-h-[55vh] flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white p-10 text-center transition ${
          busy ? "border-indigo-400 bg-indigo-50/50" : "border-gray-300 hover:border-indigo-400"
        }`}
      >
        {busy ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <h2 className="mt-4 text-lg font-semibold">{STAGES[stage]}</h2>
            {fileName && (
              <p className="mt-1 text-sm text-muted-foreground">{fileName}</p>
            )}
            <ol className="mt-6 flex flex-col items-start gap-1.5 text-sm">
              {STAGES.map((s, i) => (
                <li
                  key={s}
                  className={`flex items-center gap-2 ${
                    i < stage ? "text-emerald-600" : i === stage ? "text-indigo-700 font-medium" : "text-gray-400"
                  }`}
                >
                  {i < stage ? <CheckCircle2 className="h-4 w-4" /> : <span className="inline-block h-4 w-4 rounded-full border" />}
                  {s}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-indigo-600" />
            <h2 className="mt-4 text-xl font-semibold">Upload your resume</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Drop a <span className="font-medium">.pdf</span> or{" "}
              <span className="font-medium">.docx</span> file here. We'll read the
              content and structure, then build an editable template you can
              tailor to any job description.
            </p>
            <button
              type="button"
              onClick={onPick}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <FileText className="h-4 w-4" />
              Choose file
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Max 10 MB · text-based PDFs only (scanned images aren't supported)
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={onChange}
            />
          </>
        )}
      </div>

      <aside className="rounded-lg border border-border bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          How it works
        </h3>
        <ul className="mt-3 space-y-2.5 text-sm">
          {[
            ["Reads your file", "PDF text + Word document content"],
            ["Detects sections", "summary, skills, experience, projects, education and more"],
            ["Preserves wording", "AI normalises structure but never invents content"],
            ["Editable instantly", "switch to the Master tab to tweak anything"],
            ["Tailor to any JD", "the Tailor tab rewrites bullets to match a job"],
            ["Replaces existing", "uploading overwrites your current master resume"],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-2">
              <span className="text-indigo-600">✦</span>
              <span>
                <span className="font-medium">{title}</span>
                <span className="text-muted-foreground"> — {desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
