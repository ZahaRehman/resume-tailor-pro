import type { ResumeData } from "@/types/resume";

type Props = {
  resume: ResumeData;
  /** When true, applies print-page styles (no border/shadow). */
  printMode?: boolean;
};

const linkStyle: React.CSSProperties = { color: "#1155cc", textDecoration: "none" };

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: "13px 0 6px 0",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        color: "#000",
        borderBottom: "1.5px solid #000",
        paddingBottom: 2,
      }}
    >
      {children}
    </h2>
  );
}

export function ResumeTemplate({ resume, printMode = false }: Props) {
  const wrapperStyle: React.CSSProperties = {
    fontFamily: "Calibri, Arial, sans-serif",
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

  return (
    <div style={wrapperStyle} className="resume-template">
      {/* Name */}
      <h1
        style={{
          textAlign: "center",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "1px",
          textTransform: "uppercase",
          margin: "0 0 8px 0",
          color: "#000",
        }}
      >
        {resume.name}
      </h1>

      {/* Contact table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
        <tbody>
          <tr>
            <td style={{ width: "33%", textAlign: "left", padding: "1px 0" }}>{resume.contact.location}</td>
            <td style={{ width: "34%", textAlign: "center", padding: "1px 0" }}>
              LinkedIn:{" "}
              <a href={`https://${resume.contact.linkedin}`} style={linkStyle}>
                {resume.contact.linkedin}
              </a>
            </td>
            <td style={{ width: "33%", textAlign: "right", padding: "1px 0" }}></td>
          </tr>
          <tr>
            <td style={{ textAlign: "left", padding: "1px 0" }}>Contact: {resume.contact.phone}</td>
            <td style={{ textAlign: "center", padding: "1px 0" }}>
              GitHub:{" "}
              <a href={`https://${resume.contact.github}`} style={linkStyle}>
                {resume.contact.github}
              </a>
            </td>
            <td style={{ textAlign: "right", padding: "1px 0" }}>
              Email:{" "}
              <a href={`mailto:${resume.contact.email}`} style={linkStyle}>
                {resume.contact.email}
              </a>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ borderTop: "1.5px solid #000", marginTop: 4 }} />

      {/* Summary */}
      <SectionHeading>Professional Summary</SectionHeading>
      <p style={{ margin: 0 }}>{resume.summary}</p>

      {/* Skills */}
      <SectionHeading>Key Skills</SectionHeading>
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
                        <span style={{ marginRight: 6 }}>●</span>
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

      {/* Experience */}
      <SectionHeading>Professional Experience</SectionHeading>
      {resume.experience.map((exp, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ fontSize: 11.5, fontWeight: 700, color: "#000" }}>{exp.role}</td>
                <td style={{ fontSize: 10.5, fontStyle: "italic", textAlign: "right" }}>{exp.duration}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 10.8, fontStyle: "italic" }}>{exp.company}</div>
          <ul style={{ margin: "4px 0 0 0", paddingLeft: 20 }}>
            {exp.bullets.map((b, j) => (
              <li key={j} style={{ marginBottom: 2 }}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      {/* Projects */}
      <SectionHeading>Projects</SectionHeading>
      {resume.projects.map((p, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#000" }}>{p.name}</div>
          <ul style={{ margin: "4px 0 0 0", paddingLeft: 20 }}>
            {p.bullets.map((b, j) => (
              <li key={j} style={{ marginBottom: 2 }}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      {/* Education */}
      <SectionHeading>Education</SectionHeading>
      {resume.education.map((e, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
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
      ))}

      {/* Additional Skills */}
      <SectionHeading>Additional Skills &amp; Strengths</SectionHeading>
      {resume.additionalSkills.map((a, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <div style={{ fontWeight: 700, color: "#000" }}>{a.title}</div>
          <div>{a.description}</div>
        </div>
      ))}
    </div>
  );
}
