import { useEffect, useRef, useState } from "react";
import { useResume } from "@/context/ResumeContext";
import type { ResumeData } from "@/types/resume";
import { toast } from "sonner";

export function JsonEditor() {
  const { masterResume, setMasterResume, saveMaster } = useResume();
  const [text, setText] = useState<string>("");
  const [valid, setValid] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (masterResume && !initRef.current) {
      setText(JSON.stringify(masterResume, null, 2));
      initRef.current = true;
    }
  }, [masterResume]);

  const onChange = (val: string) => {
    setText(val);
    let parsed: ResumeData | null = null;
    try {
      parsed = JSON.parse(val);
      setValid(true);
    } catch {
      setValid(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        if (parsed) {
          setMasterResume(parsed);
          await saveMaster(parsed);
          toast.success("Saved ✓", { duration: 1200 });
        }
      } catch (e: unknown) {
        toast.error("Save failed: " + (e instanceof Error ? e.message : String(e)));
      }
    }, 1000);
  };

  return (
    <div className="relative h-full">
      <div className="absolute right-3 top-3 z-10">
        {valid ? (
          <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
            Valid JSON
          </span>
        ) : (
          <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200">
            Syntax Error
          </span>
        )}
      </div>
      <textarea
        spellCheck={false}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        className="h-full w-full resize-none rounded-lg border border-border bg-white p-4 pt-12 font-mono text-[13px] leading-5 text-foreground outline-none focus:border-indigo-500"
        style={{ minHeight: "calc(100vh - 220px)" }}
      />
    </div>
  );
}
