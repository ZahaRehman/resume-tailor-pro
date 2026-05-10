import { useResume } from "@/context/ResumeContext";

export function StructurePreview() {
  const { masterResume } = useResume();
  if (!masterResume) return null;
  const r = masterResume;
  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">Name</div>
        <div className="text-base font-bold">{r.name}</div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">Summary</div>
        <p className="text-foreground">
          {r.summary.length > 120 ? r.summary.slice(0, 120) + "…" : r.summary}
        </p>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">
          Skills ({r.skills.length})
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {r.skills.slice(0, 8).map((s, i) => (
            <span key={i} className="rounded bg-muted px-2 py-0.5 text-xs">{s}</span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">Experience</div>
        <ul className="mt-1 space-y-1">
          {r.experience.map((e, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium">{e.role}</span> · {e.company}
              <span className="text-muted-foreground"> ({e.bullets.length} bullets)</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">Projects</div>
        <ul className="mt-1 list-disc pl-5">
          {r.projects.map((p, i) => (
            <li key={i} className="text-sm">{p.name}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">Education</div>
        <ul className="mt-1">
          {r.education.map((e, i) => (
            <li key={i} className="text-sm">
              {e.institution} · <span className="italic">{e.degree}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
