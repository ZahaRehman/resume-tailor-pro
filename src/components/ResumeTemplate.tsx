import type { CSSProperties } from "react";
import type { ResumeData, ResumeLayout, SectionKey } from "@/types/resume";
import {
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
  printMode?: boolean;
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

function Block({
  children,
  keepWithNext = false,
}: {
  children: React.ReactNode;
  keepWithNext?: boolean;
}) {
  return (
    <div data-pdf-block="1" data-pdf-keep-with-next={keepWithNext ? "1" : "0"}>
      {children}
    </div>
  );
}

export function ResumeTemplate({ resume, layout, printMode = false }: Props) {
  const L = withDefaults(layout);
  const wrapperStyle: CSSProperties = {
    fontFamily: fontStack(L.fontFamily),
    fontSize: 10.8,
    lineHeight: 1.45,
    color: "#111",
    background: "#fff",
    padding: printMode ? "0.5in 0.5in" : "36px 48px",
    width: printMode ? "auto" : "8.5in",
    maxWidth: "100%",
    boxSizing: "border-box",
    margin: "0 auto",
  };

  const renderers: Record<SectionKey, () => React.ReactNode> = {
    summary: () => (
      <Block key="summary">
        <SectionHeading layout={L}>{SECTION_TITLES.summary}</SectionHeading>
        <p style={{ margin: 0 }}>{resume.summary}</p>
      </Block>
    ),
    skills: () => (
      <Block key="skills">
        <SectionHeading layout={L}>{SECTION_TITLES.skills}</SectionHeading>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {Array.from({ length: Math.ceil(resume.skills.length / 4) }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {[0, 1, 2, 3].map((c) => {
                  const skill = resume.skills[rowIdx * 4 + c];
                  return (
                    <td key={c} style={{ width: "25%", padding: "2px 4px", verticalAlign: "top" }}>
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
      </Block>
    ),
    experience: () => (
      <>
        <Block key="experience-h" keepWithNext>
          <SectionHeading layout={L}>{SECTION_TITLES.experience}</SectionHeading>
        </Block>
        {resume.experience.map((exp, i) => (
          <Block key={`exp-${i}`}>
            <div style={{ marginBottom: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ fontSize: 11.5, fontWeight: 700, color: "#000" }}>{exp.role}</td>
                    <td style={{ fontSize: 10.5, fontStyle: "italic", textAlign: "right" }}>{exp.duration}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ fontSize: 10.8, fontStyle: "italic" }}>{exp.company}</div>
              <ul style={{ margin: "4px 0 0 0", paddingLeft: 20, listStyleType: "none" }}>
                {exp.bullets.map((b, j) => (
                  <li key={j} style={{ marginBottom: 2, position: "relative", paddingLeft: 2 }}>
                    <span style={{ position: "absolute", left: -14, color: L.accentColor }}>{L.bulletChar}</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </Block>
        ))}
      </>
    ),
    projects: () => (
      <>
        <Block key="projects-h" keepWithNext>
          <SectionHeading layout={L}>{SECTION_TITLES.projects}</SectionHeading>
        </Block>
        {resume.projects.map((p, i) => (
          <Block key={`proj-${i}`}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#000" }}>{p.name}</div>
              <ul style={{ margin: "4px 0 0 0", paddingLeft: 20, listStyleType: "none" }}>
                {p.bullets.map((b, j) => (
                  <li key={j} style={{ marginBottom: 2, position: "relative", paddingLeft: 2 }}>
                    <span style={{ position: "absolute", left: -14, color: L.accentColor }}>{L.bulletChar}</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </Block>
        ))}
      </>
    ),
    education: () => (
      <>
        <Block key="edu-h" keepWithNext>
          <SectionHeading layout={L}>{SECTION_TITLES.education}</SectionHeading>
        </Block>
        {resume.education.map((e, i) => (
          <Block key={`edu-${i}`}>
            <div style={{ marginBottom: 6 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700, color: "#000" }}>{e.institution}</td>
                    <td style={{ fontStyle: "italic", textAlign: "right" }}>{e.duration}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ fontStyle: "italic" }}>
                {e.degree}
                {e.gpa ? ` — CGPA: ${e.gpa}` : ""}
              </div>
            </div>
          </Block>
        ))}
      </>
    ),
    additionalSkills: () => (
      <>
        <Block key="add-h" keepWithNext>
          <SectionHeading layout={L}>{SECTION_TITLES.additionalSkills}</SectionHeading>
        </Block>
        {resume.additionalSkills.map((a, i) => (
          <Block key={`add-${i}`}>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 700, color: "#000" }}>{a.title}</div>
              <div>{a.description}</div>
            </div>
          </Block>
        ))}
      </>
    ),
  };

  return (
    <div style={wrapperStyle} className="resume-template">
      {/* Header is always first */}
      <Block>
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
          }}
        >
          {resume.name}
        </h1>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
          <tbody>
            <tr>
              <td style={{ width: "33%", textAlign: "left", padding: "1px 0" }}>{resume.contact.location}</td>
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
              <td style={{ width: "33%", textAlign: "right", padding: "1px 0" }}></td>
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
      </Block>

      {(L.sectionOrder ?? DEFAULT_LAYOUT.sectionOrder).map((key) => renderers[key]?.())}
    </div>
  );
}
