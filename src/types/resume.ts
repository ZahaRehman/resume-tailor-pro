export type Contact = {
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
};

export type ExperienceEntry = {
  role: string;
  company: string;
  duration: string;
  bullets: string[];
};

export type ProjectEntry = {
  name: string;
  bullets: string[];
};

export type EducationEntry = {
  institution: string;
  degree: string;
  duration: string;
  gpa?: string;
};

export type AdditionalSkillEntry = {
  title: string;
  description: string;
};

export type ResumeData = {
  name: string;
  contact: Contact;
  summary: string;
  skills: string[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  education: EducationEntry[];
  additionalSkills: AdditionalSkillEntry[];
};

export type SectionKey =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "additionalSkills";

export type ResumeLayout = {
  sectionOrder?: SectionKey[];
  headingStyle?: "uppercase" | "title" | "smallcaps";
  headingUnderline?: boolean;
  accentColor?: string;
  fontFamily?: "serif" | "sans";
  columns?: 1 | 2;
  bulletChar?: string;
};
