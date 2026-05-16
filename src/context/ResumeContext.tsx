import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ResumeData, ResumeLayout } from "@/types/resume";

type ActiveTab = "upload" | "master" | "tailor" | "preview";
type ActiveView = "master" | "tailored";

type Ctx = {
  rowId: string | null;
  masterResume: ResumeData | null;
  tailoredResume: ResumeData | null;
  masterLayout: ResumeLayout | null;
  setMasterResume: (r: ResumeData) => void;
  setTailoredResume: (r: ResumeData | null) => void;
  setMasterLayout: (l: ResumeLayout | null) => void;
  saveMaster: (r: ResumeData, layout?: ResumeLayout | null) => Promise<void>;
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
  const [masterLayout, setMasterLayout] = useState<ResumeLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("master");
  const [activeView, setActiveView] = useState<ActiveView>("master");
  const [jdText, setJdText] = useState("");
  const [isTailoring, setIsTailoring] = useState(false);
  const [isUpdatingSection, setIsUpdatingSection] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

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
        .select("id, data, layout")
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
        setMasterLayout((data.layout as unknown as ResumeLayout) ?? null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reloadTick]);

  const saveMaster = async (r: ResumeData, layout?: ResumeLayout | null) => {
    const layoutToWrite = layout === undefined ? masterLayout : layout;
    if (rowId) {
      const { error } = await supabase
        .from("master_resume")
        .update({ data: r as never, layout: (layoutToWrite ?? null) as never })
        .eq("id", rowId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("master_resume")
        .insert({ data: r as never, layout: (layoutToWrite ?? null) as never })
        .select("id")
        .single();
      if (error) throw error;
      if (data) setRowId(data.id);
    }
    if (layout !== undefined) setMasterLayout(layout);
  };

  const value: Ctx = {
    rowId, masterResume, tailoredResume, masterLayout,
    setMasterResume, setTailoredResume, setMasterLayout, saveMaster,
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
