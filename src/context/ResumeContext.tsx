import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ResumeData } from "@/types/resume";

type ActiveTab = "master" | "tailor" | "preview";
type ActiveView = "master" | "tailored";

type Ctx = {
  rowId: string | null;
  masterResume: ResumeData | null;
  tailoredResume: ResumeData | null;
  setMasterResume: (r: ResumeData) => void;
  setTailoredResume: (r: ResumeData | null) => void;
  saveMaster: (r: ResumeData) => Promise<void>;
  loading: boolean;
  loadError: string | null;
  reload: () => void;
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
  jdText: string;
  setJdText: (s: string) => void;
  isTailoring: boolean;
  setIsTailoring: (b: boolean) => void;
  isUpdatingSection: boolean;
  setIsUpdatingSection: (b: boolean) => void;
};

const ResumeContext = createContext<Ctx | null>(null);

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [rowId, setRowId] = useState<string | null>(null);
  const [masterResume, setMasterResume] = useState<ResumeData | null>(null);
  const [tailoredResume, setTailoredResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("master");
  const [activeView, setActiveView] = useState<ActiveView>("master");
  const [jdText, setJdText] = useState("");
  const [isTailoring, setIsTailoring] = useState(false);
  const [isUpdatingSection, setIsUpdatingSection] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Persist tailored resume across tabs/reloads (session only)
  useEffect(() => {
    const cached = sessionStorage.getItem("tailoredResume");
    if (cached) {
      try { setTailoredResume(JSON.parse(cached)); } catch {}
    }
  }, []);
  useEffect(() => {
    if (tailoredResume) sessionStorage.setItem("tailoredResume", JSON.stringify(tailoredResume));
  }, [tailoredResume]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from("master_resume")
        .select("id, data")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }
      if (data) {
        setRowId(data.id);
        setMasterResume(data.data as unknown as ResumeData);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reloadTick]);

  const saveMaster = async (r: ResumeData) => {
    if (!rowId) return;
    const { error } = await supabase
      .from("master_resume")
      .update({ data: r as unknown as Record<string, unknown> })
      .eq("id", rowId);
    if (error) throw error;
  };

  const value: Ctx = {
    rowId, masterResume, tailoredResume,
    setMasterResume, setTailoredResume, saveMaster,
    loading, loadError,
    reload: () => setReloadTick((t) => t + 1),
    activeTab, setActiveTab, activeView, setActiveView,
    jdText, setJdText,
    isTailoring, setIsTailoring,
    isUpdatingSection, setIsUpdatingSection,
  };

  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>;
}

export function useResume() {
  const ctx = useContext(ResumeContext);
  if (!ctx) throw new Error("useResume must be used within ResumeProvider");
  return ctx;
}
