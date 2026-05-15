import { createFileRoute } from "@tanstack/react-router";
import { ResumeProvider, useResume } from "@/context/ResumeContext";
import { JsonEditor } from "@/components/JsonEditor";
import { StructurePreview } from "@/components/StructurePreview";
import { TailorTab } from "@/components/TailorTab";
import { PreviewTab } from "@/components/PreviewTab";
import { UploadTab } from "@/components/UploadTab";
import { Toaster } from "@/components/ui/sonner";
import { FileText, Sparkles, Eye, AlertCircle, Loader2, Upload } from "lucide-react";

export const Route = createFileRoute("/")({
  component: () => (
    <ResumeProvider>
      <App />
      <Toaster richColors position="bottom-right" />
    </ResumeProvider>
  ),
});

function App() {
  const { activeTab, setActiveTab, loading, loadError, reload, masterResume } = useResume();

  const tabs = [
    { id: "upload" as const, label: "Upload", Icon: Upload },
    { id: "master" as const, label: "Master Resume", Icon: FileText },
    { id: "tailor" as const, label: "Tailor", Icon: Sparkles },
    { id: "preview" as const, label: "Preview & Download", Icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">AI Resume Builder</h1>
            <p className="text-xs text-muted-foreground">
              {masterResume ? `${masterResume.name} · personal tailoring tool` : "personal tailoring tool"}
            </p>
          </div>
          <nav className="flex gap-1 rounded-lg border border-border bg-white p-1">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === id
                    ? "bg-indigo-600 text-white"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {loadError ? (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div className="flex-1">
              <div className="font-semibold">Failed to load resume</div>
              <div className="text-xs">{loadError}</div>
            </div>
            <button onClick={reload} className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white">
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading resume…
          </div>
        ) : activeTab === "upload" ? (
          <UploadTab />
        ) : activeTab === "master" ? (
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <div className="rounded-lg border border-border bg-white p-1">
              <JsonEditor />
            </div>
            <div className="rounded-lg border border-border bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Structure preview
              </h3>
              <StructurePreview />
            </div>
          </div>
        ) : activeTab === "tailor" ? (
          <TailorTab />
        ) : (
          <PreviewTab />
        )}
      </main>
    </div>
  );
}
