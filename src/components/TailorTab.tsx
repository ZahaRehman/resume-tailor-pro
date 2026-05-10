import { useEffect, useState } from "react";
import { useResume } from "@/context/ResumeContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

const STATUS_MESSAGES = [
  "Reading job description...",
  "Rewriting bullets...",
  "Optimising skills order...",
];

export function TailorTab() {
  const {
    masterResume, jdText, setJdText,
    isTailoring, setIsTailoring,
    setTailoredResume, setActiveTab, setActiveView,
  } = useResume();
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    if (!isTailoring) return;
    setStatusIdx(0);
    const t = setInterval(() => setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length), 1500);
    return () => clearInterval(t);
  }, [isTailoring]);

  const onTailor = async () => {
    if (!masterResume || !jdText.trim()) return;
    setIsTailoring(true);
    try {
      const { data, error } = await supabase.functions.invoke("tailor-resume", {
        body: { master: masterResume, jd: jdText },
      });
      if (error) throw error;
      if (!data?.tailored) throw new Error("No tailored result returned");
      setTailoredResume(data.tailored);
      setActiveView("tailored");
      setActiveTab("preview");
      toast.success("Resume tailored ✓");
    } catch (e: unknown) {
      toast.error("AI tailoring failed. Please try again.");
      console.error(e);
    } finally {
      setIsTailoring(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-foreground">Job Description</label>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste the complete job description here — include responsibilities, requirements, and tech stack..."
          className="min-h-[60vh] w-full resize-y rounded-lg border border-border bg-white p-4 font-serif text-[15px] leading-relaxed outline-none focus:border-indigo-500"
        />
        <button
          onClick={onTailor}
          disabled={!jdText.trim() || isTailoring}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isTailoring ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {STATUS_MESSAGES[statusIdx]}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Tailor My Resume
            </>
          )}
        </button>
      </div>

      <aside className="rounded-lg border border-border bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          What the AI does
        </h3>
        <ul className="mt-3 space-y-2.5 text-sm">
          {[
            ["Rewrites bullets", "mirrors JD language and keywords"],
            ["Rewrites summary", "targets the specific role"],
            ["Reorders skills", "most relevant first"],
            ["Never fabricates", "only reframes what exists"],
            ["Refine any section", "ask follow-up edits after tailoring"],
            ["Clean PDF export", "print-quality output"],
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
