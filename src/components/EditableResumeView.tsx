import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pencil, Save, X, Plus, Trash2, GripVertical, EyeOff, Eye } from "lucide-react";
import type {
  ResumeData,
  ResumeLayout,
  SectionKey,
  ExperienceEntry,
  ProjectEntry,
  EducationEntry,
  AdditionalSkillEntry,
} from "@/types/resume";
import {
  ALL_SECTIONS,
  DEFAULT_LAYOUT,
  SECTION_TITLES,
  fontStack,
  formatHeadingText,
  headingCss,
  withDefaults,
} from "@/lib/resumeLayout";

type Props = {
  resume: ResumeData;
  layout?: ResumeLayout | null;
  onSave: (updated: ResumeData) => Promise<void> | void;
  onLayoutChange?: (next: ResumeLayout) => Promise<void> | void;
};

const linkStyle: CSSProperties = { color: "#1155cc", textDecoration: "none" };

function SectionHeading({
  children,
  layout,
}: {
  children: string;
  layout: Required<ResumeLayout>;
}) {
  return <h2 style={headingCss(layout)}>{formatHeadingText(children, layout.headingStyle)}</h2>;
}

/** Auto-growing textarea that wraps long input cleanly. */
function AutoTextarea({
  value,
  onChange,
  placeholder,
  style,
  rows = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: CSSProperties;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useEffect(() => {
    resize();
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      style={{
        width: "100%",
        boxSizing: "border-box",
        font: "inherit",
        color: "inherit",
        background: "#fffdf3",
        border: "1px solid #e5d985",
        borderRadius: 4,
        padding: "4px 6px",
        resize: "none",
        overflow: "hidden",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        lineHeight: 1.45,
        ...style,
      }}
    />
  );
}

/** Wrapper for each editable section: shows children in display mode,
 *  swaps to edit form on click; Save/Cancel commit/discard. */
function SectionCard<T>({
  label,
  initial,
  onCommit,
  renderDisplay,
  renderEdit,
}: {
  label: string;
  initial: T;
  onCommit: (next: T) => Promise<void> | void;
  renderDisplay: () => React.ReactNode;
  renderEdit: (draft: T, setDraft: (next: T) => void) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T>(initial);
  const [saving, setSaving] = useState(false);

  // Reset draft when leaving edit mode or when external data changes.
  useEffect(() => {
    if (!editing) setDraft(initial);
  }, [editing, initial]);

  const start = () => {
    setDraft(initial);
    setEditing(true);
  };
  const cancel = () => setEditing(false);
  const save = async () => {
    setSaving(true);
    try {
      await onCommit(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        padding: "6px 8px",
        margin: "0 -8px",
        borderRadius: 6,
        border: editing ? "1px dashed #6366f1" : "1px solid transparent",
        background: editing ? "rgba(99,102,241,0.04)" : undefined,
      }}
      onMouseEnter={(e) => {
        if (!editing) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.025)";
      }}
      onMouseLeave={(e) => {
        if (!editing) (e.currentTarget as HTMLElement).style.background = "";
      }}
    >
      <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
        {editing ? (
          <>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              title="Cancel"
              style={btnSecondary}
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              title="Save"
              style={btnPrimary}
            >
              <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={start}
            title={`Edit ${label}`}
            style={btnGhost}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>
      {editing ? renderEdit(draft, setDraft) : renderDisplay()}
    </div>
  );
}

const btnBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 8px",
  borderRadius: 4,
  border: "1px solid transparent",
  cursor: "pointer",
  lineHeight: 1.2,
};
const btnGhost: CSSProperties = {
  ...btnBase,
  background: "rgba(255,255,255,0.85)",
  color: "#374151",
  border: "1px solid #d1d5db",
};
const btnPrimary: CSSProperties = {
  ...btnBase,
  background: "#4f46e5",
  color: "#fff",
};
const btnSecondary: CSSProperties = {
  ...btnBase,
  background: "#fff",
  color: "#374151",
  border: "1px solid #d1d5db",
};
const smallAddBtn: CSSProperties = {
  ...btnBase,
  background: "#fff",
  color: "#4f46e5",
  border: "1px dashed #818cf8",
  marginTop: 4,
};
const removeBtn: CSSProperties = {
  ...btnBase,
  background: "#fff",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  padding: "2px 6px",
};

const fieldRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "110px 1fr",
  gap: 6,
  alignItems: "start",
  marginBottom: 4,
};
const fieldLabel: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  color: "#4b5563",
  paddingTop: 6,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

export function EditableResumeView({ resume, layout, onSave, onLayoutChange }: Props) {
  const L = withDefaults(layout);
  const order = L.sectionOrder;
  const hidden = ALL_SECTIONS.filter((k) => !order.includes(k));

  const [dragKey, setDragKey] = useState<SectionKey | null>(null);
  const [dropTarget, setDropTarget] = useState<SectionKey | null>(null);

  const updateOrder = (next: SectionKey[]) => {
    if (!onLayoutChange) return;
    onLayoutChange({ ...(layout ?? {}), sectionOrder: next });
  };
  const hideSection = (k: SectionKey) => updateOrder(order.filter((x) => x !== k));
  const showSection = (k: SectionKey) => updateOrder([...order, k]);
  const moveSection = (from: SectionKey, to: SectionKey) => {
    if (from === to) return;
    const next = order.filter((k) => k !== from);
    const idx = next.indexOf(to);
    next.splice(idx, 0, from);
    updateOrder(next);
  };

  // Section-scoped commit helpers — each merges the partial into the full resume.
  const commit = async (partial: Partial<ResumeData>) => {
    await onSave({ ...resume, ...partial });
  };

  const wrapperStyle: CSSProperties = {
    fontFamily: fontStack(L.fontFamily),
    fontSize: 10.8,
    lineHeight: 1.45,
    color: "#111",
    background: "#fff",
    padding: "36px 48px",
    width: "8.5in",
    maxWidth: "100%",
    boxSizing: "border-box",
    margin: "0 auto",
  };

  const sections: Record<SectionKey, React.ReactNode> = {
    summary: (
      <SectionCard
        key="summary"
        label="summary"
        initial={resume.summary}
        onCommit={(s) => commit({ summary: s })}
        renderDisplay={() => (
          <>
            <SectionHeading layout={L}>{SECTION_TITLES.summary}</SectionHeading>
            <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {resume.summary}
            </p>
          </>
        )}
        renderEdit={(d, setD) => (
          <>
            <SectionHeading layout={L}>{SECTION_TITLES.summary}</SectionHeading>
            <AutoTextarea value={d} onChange={setD} rows={3} />
          </>
        )}
      />
    ),
    skills: (
      <SectionCard
        key="skills"
        label="skills"
        initial={resume.skills}
        onCommit={(s) => commit({ skills: s.map((x) => x.trim()).filter(Boolean) })}
        renderDisplay={() => (
          <>
            <SectionHeading layout={L}>{SECTION_TITLES.skills}</SectionHeading>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {Array.from({ length: Math.ceil(resume.skills.length / 4) }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    {[0, 1, 2, 3].map((c) => {
                      const skill = resume.skills[rowIdx * 4 + c];
                      return (
                        <td
                          key={c}
                          style={{
                            width: "25%",
                            padding: "2px 4px",
                            verticalAlign: "top",
                            wordBreak: "break-word",
                          }}
                        >
                          {skill ? (
                            <>
                              <span style={{ marginRight: 6, color: L.accentColor }}>{L.bulletChar}</span>
                              {skill}
                            </>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        renderEdit={(d, setD) => (
          <>
            <SectionHeading layout={L}>{SECTION_TITLES.skills}</SectionHeading>
            <p style={{ fontSize: 10.5, color: "#6b7280", margin: "0 0 6px" }}>
              One skill per line.
            </p>
            <AutoTextarea
              value={d.join("\n")}
              onChange={(v) => setD(v.split("\n").map((s) => s))}
              rows={6}
            />
          </>
        )}
      />
    ),
    experience: (
      <SectionCard
        key="experience"
        label="experience"
        initial={resume.experience}
        onCommit={(e) => commit({ experience: e })}
        renderDisplay={() => (
          <>
            <SectionHeading layout={L}>{SECTION_TITLES.experience}</SectionHeading>
            {resume.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ fontSize: 11.5, fontWeight: 700, color: "#000" }}>
                        {exp.role}
                      </td>
                      <td
                        style={{
                          fontSize: 10.5,
                          fontStyle: "italic",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {exp.duration}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ fontSize: 10.8, fontStyle: "italic" }}>{exp.company}</div>
                <ul style={{ margin: "4px 0 0 0", paddingLeft: 20, listStyleType: "none" }}>
                  {exp.bullets.map((b, j) => (
                    <li key={j} style={{ marginBottom: 2, wordBreak: "break-word", position: "relative", paddingLeft: 2 }}>
                      <span style={{ position: "absolute", left: -14, color: L.accentColor }}>{L.bulletChar}</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
        renderEdit={(d, setD) => (
          <>
            <SectionHeading layout={L}>{SECTION_TITLES.experience}</SectionHeading>
            {d.map((exp, i) => (
              <ExperienceEditor
                key={i}
                value={exp}
                onChange={(next) =>
                  setD(d.map((x, idx) => (idx === i ? next : x)))
                }
                onRemove={() => setD(d.filter((_, idx) => idx !== i))}
              />
            ))}
            <button
              type="button"
              style={smallAddBtn}
              onClick={() =>
                setD([...d, { role: "", company: "", duration: "", bullets: [""] }])
              }
            >
              <Plus className="h-3 w-3" /> Add experience
            </button>
          </>
        )}
      />
    ),
    projects: (
      <SectionCard
        key="projects"
        label="projects"
        initial={resume.projects}
        onCommit={(p) => commit({ projects: p })}
        renderDisplay={() => (
          <>
            <SectionHeading layout={L}>{SECTION_TITLES.projects}</SectionHeading>
            {resume.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#000" }}>{p.name}</div>
                <ul style={{ margin: "4px 0 0 0", paddingLeft: 20, listStyleType: "none" }}>
                  {p.bullets.map((b, j) => (
                    <li key={j} style={{ marginBottom: 2, wordBreak: "break-word", position: "relative", paddingLeft: 2 }}>
                      <span style={{ position: "absolute", left: -14, color: L.accentColor }}>{L.bulletChar}</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
        renderEdit={(d, setD) => (
          <>
            <SectionHeading layout={L}>{SECTION_TITLES.projects}</SectionHeading>
            {d.map((p, i) => (
              <ProjectEditor
                key={i}
                value={p}
                onChange={(next) => setD(d.map((x, idx) => (idx === i ? next : x)))}
                onRemove={() => setD(d.filter((_, idx) => idx !== i))}
              />
            ))}
            <button
              type="button"
              style={smallAddBtn}
              onClick={() => setD([...d, { name: "", bullets: [""] }])}
            >
              <Plus className="h-3 w-3" /> Add project
            </button>
          </>
        )}
      />
    ),
    education: (
      <SectionCard
        key="education"
        label="education"
        initial={resume.education}
        onCommit={(e) => commit({ education: e })}
        renderDisplay={() => (
          <>
            <SectionHeading layout={L}>{SECTION_TITLES.education}</SectionHeading>
            {resume.education.map((e, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 700, color: "#000", wordBreak: "break-word" }}>
                        {e.institution}
                      </td>
                      <td
                        style={{
                          fontStyle: "italic",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.duration}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ fontStyle: "italic" }}>
                  {e.degree}
                  {e.gpa ? ` — CGPA: ${e.gpa}` : ""}
                </div>
              </div>
            ))}
          </>
        )}
        renderEdit={(d, setD) => (
          <>
            <SectionHeading layout={L}>{SECTION_TITLES.education}</SectionHeading>
            {d.map((e, i) => (
              <EducationEditor
                key={i}
                value={e}
                onChange={(next) => setD(d.map((x, idx) => (idx === i ? next : x)))}
                onRemove={() => setD(d.filter((_, idx) => idx !== i))}
              />
            ))}
            <button
              type="button"
              style={smallAddBtn}
              onClick={() =>
                setD([...d, { institution: "", degree: "", duration: "", gpa: "" }])
              }
            >
              <Plus className="h-3 w-3" /> Add education
            </button>
          </>
        )}
      />
    ),
    additionalSkills: (
      <SectionCard
        key="additionalSkills"
        label="additional skills"
        initial={resume.additionalSkills}
        onCommit={(a) => commit({ additionalSkills: a })}
        renderDisplay={() => (
          <>
            <SectionHeading layout={L}>{SECTION_TITLES.additionalSkills}</SectionHeading>
            {resume.additionalSkills.map((a, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: "#000" }}>{a.title}</div>
                <div style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                  {a.description}
                </div>
              </div>
            ))}
          </>
        )}
        renderEdit={(d, setD) => (
          <>
            <SectionHeading layout={L}>{SECTION_TITLES.additionalSkills}</SectionHeading>
            {d.map((a, i) => (
              <AdditionalSkillEditor
                key={i}
                value={a}
                onChange={(next) => setD(d.map((x, idx) => (idx === i ? next : x)))}
                onRemove={() => setD(d.filter((_, idx) => idx !== i))}
              />
            ))}
            <button
              type="button"
              style={smallAddBtn}
              onClick={() => setD([...d, { title: "", description: "" }])}
            >
              <Plus className="h-3 w-3" /> Add item
            </button>
          </>
        )}
      />
    ),
  };

  return (
    <div style={wrapperStyle}>
      {/* HEADER: name + contact (always first) */}
      <SectionCard
        label="header"
        initial={{ name: resume.name, contact: resume.contact }}
        onCommit={(d) => commit({ name: d.name, contact: d.contact })}
        renderDisplay={() => (
          <>
            <h1
              style={{
                textAlign: "center",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "1px",
                textTransform: L.headingStyle === "uppercase" ? "uppercase" : "none",
                fontVariant: L.headingStyle === "smallcaps" ? "small-caps" : "normal",
                margin: "0 0 8px 0",
                color: L.accentColor,
                wordBreak: "break-word",
              }}
            >
              {resume.name}
            </h1>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
              <tbody>
                <tr>
                  <td style={{ width: "33%", textAlign: "left", padding: "1px 0" }}>
                    {resume.contact.location}
                  </td>
                  <td style={{ width: "34%", textAlign: "center", padding: "1px 0" }}>
                    {resume.contact.linkedin ? (
                      <>
                        LinkedIn:{" "}
                        <a href={`https://${resume.contact.linkedin}`} style={linkStyle}>
                          {resume.contact.linkedin}
                        </a>
                      </>
                    ) : null}
                  </td>
                  <td style={{ width: "33%", textAlign: "right", padding: "1px 0" }} />
                </tr>
                <tr>
                  <td style={{ textAlign: "left", padding: "1px 0" }}>
                    {resume.contact.phone ? `Contact: ${resume.contact.phone}` : ""}
                  </td>
                  <td style={{ textAlign: "center", padding: "1px 0" }}>
                    {resume.contact.github ? (
                      <>
                        GitHub:{" "}
                        <a href={`https://${resume.contact.github}`} style={linkStyle}>
                          {resume.contact.github}
                        </a>
                      </>
                    ) : null}
                  </td>
                  <td style={{ textAlign: "right", padding: "1px 0" }}>
                    {resume.contact.email ? (
                      <>
                        Email:{" "}
                        <a href={`mailto:${resume.contact.email}`} style={linkStyle}>
                          {resume.contact.email}
                        </a>
                      </>
                    ) : null}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ borderTop: `1.5px solid ${L.accentColor}`, marginTop: 4 }} />
          </>
        )}
        renderEdit={(d, setD) => (
          <div style={{ paddingTop: 24 }}>
            <div style={fieldRow}>
              <div style={fieldLabel}>Name</div>
              <AutoTextarea value={d.name} onChange={(v) => setD({ ...d, name: v })} />
            </div>
            <div style={fieldRow}>
              <div style={fieldLabel}>Location</div>
              <AutoTextarea
                value={d.contact.location}
                onChange={(v) => setD({ ...d, contact: { ...d.contact, location: v } })}
              />
            </div>
            <div style={fieldRow}>
              <div style={fieldLabel}>Phone</div>
              <AutoTextarea
                value={d.contact.phone}
                onChange={(v) => setD({ ...d, contact: { ...d.contact, phone: v } })}
              />
            </div>
            <div style={fieldRow}>
              <div style={fieldLabel}>Email</div>
              <AutoTextarea
                value={d.contact.email}
                onChange={(v) => setD({ ...d, contact: { ...d.contact, email: v } })}
              />
            </div>
            <div style={fieldRow}>
              <div style={fieldLabel}>LinkedIn</div>
              <AutoTextarea
                value={d.contact.linkedin}
                onChange={(v) => setD({ ...d, contact: { ...d.contact, linkedin: v } })}
              />
            </div>
            <div style={fieldRow}>
              <div style={fieldLabel}>GitHub</div>
              <AutoTextarea
                value={d.contact.github}
                onChange={(v) => setD({ ...d, contact: { ...d.contact, github: v } })}
              />
            </div>
          </div>
        )}
      />

      {order.map((k) => {
        const isDropTarget = dropTarget === k && dragKey && dragKey !== k;
        return (
          <div
            key={k}
            onDragOver={(e) => {
              if (!dragKey || !onLayoutChange) return;
              e.preventDefault();
              if (dropTarget !== k) setDropTarget(k);
            }}
            onDragLeave={() => {
              if (dropTarget === k) setDropTarget(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragKey) moveSection(dragKey, k);
              setDragKey(null);
              setDropTarget(null);
            }}
            style={{
              position: "relative",
              opacity: dragKey === k ? 0.4 : 1,
              borderTop: isDropTarget ? "2px solid #6366f1" : "2px solid transparent",
              transition: "border-color 120ms",
            }}
          >
            {onLayoutChange ? (
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  left: -28,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  opacity: 0.7,
                }}
                className="resume-section-controls"
              >
                <button
                  type="button"
                  draggable
                  onDragStart={() => setDragKey(k)}
                  onDragEnd={() => {
                    setDragKey(null);
                    setDropTarget(null);
                  }}
                  title="Drag to reorder"
                  style={{
                    ...btnGhost,
                    cursor: "grab",
                    padding: "2px 4px",
                  }}
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => hideSection(k)}
                  title="Hide section"
                  style={{ ...removeBtn, padding: "2px 4px" }}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
            {sections[k]}
          </div>
        );
      })}

      {onLayoutChange && hidden.length > 0 ? (
        <div
          style={{
            marginTop: 20,
            padding: 10,
            border: "1px dashed #d1d5db",
            borderRadius: 6,
            background: "#fafafa",
          }}
        >
          <div style={{ ...fieldLabel, paddingTop: 0, marginBottom: 6 }}>
            Hidden sections
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {hidden.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => showSection(k)}
                style={smallAddBtn}
              >
                <Eye className="h-3 w-3" /> {SECTION_TITLES[k]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- per-item editors ---------- */

function ItemFrame({
  children,
  onRemove,
  removeLabel,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        padding: "8px 10px",
        marginBottom: 8,
        background: "#fff",
        position: "relative",
      }}
    >
      <button
        type="button"
        style={{ ...removeBtn, position: "absolute", top: 6, right: 6 }}
        onClick={onRemove}
        title={removeLabel}
      >
        <Trash2 className="h-3 w-3" /> Remove
      </button>
      <div style={{ paddingTop: 22 }}>{children}</div>
    </div>
  );
}

function BulletsEditor({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <div style={{ ...fieldLabel, paddingTop: 0, marginBottom: 4 }}>Bullets</div>
      {bullets.map((b, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "start", marginBottom: 4 }}>
          <span style={{ paddingTop: 6 }}>●</span>
          <div style={{ flex: 1 }}>
            <AutoTextarea
              value={b}
              onChange={(v) => onChange(bullets.map((x, idx) => (idx === i ? v : x)))}
            />
          </div>
          <button
            type="button"
            style={removeBtn}
            onClick={() => onChange(bullets.filter((_, idx) => idx !== i))}
            title="Remove bullet"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        style={smallAddBtn}
        onClick={() => onChange([...bullets, ""])}
      >
        <Plus className="h-3 w-3" /> Add bullet
      </button>
    </div>
  );
}

function ExperienceEditor({
  value,
  onChange,
  onRemove,
}: {
  value: ExperienceEntry;
  onChange: (next: ExperienceEntry) => void;
  onRemove: () => void;
}) {
  return (
    <ItemFrame onRemove={onRemove} removeLabel="Remove experience">
      <div style={fieldRow}>
        <div style={fieldLabel}>Role</div>
        <AutoTextarea value={value.role} onChange={(v) => onChange({ ...value, role: v })} />
      </div>
      <div style={fieldRow}>
        <div style={fieldLabel}>Company</div>
        <AutoTextarea
          value={value.company}
          onChange={(v) => onChange({ ...value, company: v })}
        />
      </div>
      <div style={fieldRow}>
        <div style={fieldLabel}>Duration</div>
        <AutoTextarea
          value={value.duration}
          onChange={(v) => onChange({ ...value, duration: v })}
        />
      </div>
      <BulletsEditor
        bullets={value.bullets}
        onChange={(b) => onChange({ ...value, bullets: b })}
      />
    </ItemFrame>
  );
}

function ProjectEditor({
  value,
  onChange,
  onRemove,
}: {
  value: ProjectEntry;
  onChange: (next: ProjectEntry) => void;
  onRemove: () => void;
}) {
  return (
    <ItemFrame onRemove={onRemove} removeLabel="Remove project">
      <div style={fieldRow}>
        <div style={fieldLabel}>Name</div>
        <AutoTextarea value={value.name} onChange={(v) => onChange({ ...value, name: v })} />
      </div>
      <BulletsEditor
        bullets={value.bullets}
        onChange={(b) => onChange({ ...value, bullets: b })}
      />
    </ItemFrame>
  );
}

function EducationEditor({
  value,
  onChange,
  onRemove,
}: {
  value: EducationEntry;
  onChange: (next: EducationEntry) => void;
  onRemove: () => void;
}) {
  return (
    <ItemFrame onRemove={onRemove} removeLabel="Remove education">
      <div style={fieldRow}>
        <div style={fieldLabel}>Institution</div>
        <AutoTextarea
          value={value.institution}
          onChange={(v) => onChange({ ...value, institution: v })}
        />
      </div>
      <div style={fieldRow}>
        <div style={fieldLabel}>Degree</div>
        <AutoTextarea
          value={value.degree}
          onChange={(v) => onChange({ ...value, degree: v })}
        />
      </div>
      <div style={fieldRow}>
        <div style={fieldLabel}>Duration</div>
        <AutoTextarea
          value={value.duration}
          onChange={(v) => onChange({ ...value, duration: v })}
        />
      </div>
      <div style={fieldRow}>
        <div style={fieldLabel}>CGPA</div>
        <AutoTextarea
          value={value.gpa ?? ""}
          onChange={(v) => onChange({ ...value, gpa: v })}
        />
      </div>
    </ItemFrame>
  );
}

function AdditionalSkillEditor({
  value,
  onChange,
  onRemove,
}: {
  value: AdditionalSkillEntry;
  onChange: (next: AdditionalSkillEntry) => void;
  onRemove: () => void;
}) {
  return (
    <ItemFrame onRemove={onRemove} removeLabel="Remove item">
      <div style={fieldRow}>
        <div style={fieldLabel}>Title</div>
        <AutoTextarea value={value.title} onChange={(v) => onChange({ ...value, title: v })} />
      </div>
      <div style={fieldRow}>
        <div style={fieldLabel}>Description</div>
        <AutoTextarea
          value={value.description}
          onChange={(v) => onChange({ ...value, description: v })}
          rows={2}
        />
      </div>
    </ItemFrame>
  );
}
