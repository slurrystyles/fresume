export interface Bullet {
  id: string;
  text: string;
  has_metric: boolean;
  source_note: string; // mandatory infrastructure for hallucination guard (e.g., "user-provided", "ai-rewrite-of:bullet_id", "voice-transcript:2026-07-15")
}

export interface Education {
  degree: string;
  institution: string;
  location: string;
  start_date: string;
  end_date: string;
  cgpa_or_percentage: string;
  board_x?: string;   // populated for student/India context
  board_xii?: string; // populated for student/India context
  is_current: boolean;
}

export interface Experience {
  title: string;
  org: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  bullets: Bullet[];
}

export interface Project {
  title: string;
  tech_stack: string[];
  role: string;
  start_date: string;
  end_date: string;
  bullets: Bullet[];
}

export interface Skills {
  technical: string[];
  tools: string[];
  soft: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
  credential_url?: string;
}

export interface Achievement {
  text: string;
  has_metric: boolean;
}

export interface SegmentFields {
  segment: "student" | "professional";
  region: string; // e.g. "India" or "International"
  target_market?: "india_campus" | "india_general" | "international";
  photo_required: boolean;
  include_marks_10_12: boolean;
  dob?: string;
  category?: string;
}

export interface ResumeMeta {
  version_number: number;
  last_scored_at: string;
}

export interface ResumeData {
  contact: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
  };
  summary: string;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: Skills;
  certifications: Certification[];
  achievements: Achievement[];
  segment_fields: SegmentFields;
  meta: ResumeMeta;
}

// Full type for database and state synchronization
export interface Resume {
  id: string;
  user_id: string;
  title: string;
  status: "draft" | "completed";
  source_type: "upload" | "scratch" | "template";
  created_at: string;
  updated_at: string;
  resume_data: ResumeData;
  score_snapshot?: ScoreSnapshot;
}

export interface ScoreSnapshot {
  overallScore: number;
  breakdown: {
    format_parseability: number;
    section_completeness: number;
    quantification_density: number;
    action_verb_strength: number;
    jd_keyword_match: number;
    length_density_fit: number;
  };
  findings: Finding[];
}

export interface Finding {
  id: string;
  category: "format" | "completeness" | "quantification" | "verbs" | "jd_match" | "length";
  severity: "high" | "medium" | "low";
  message: string;
  target_field_path: string; // path inside ResumeData, e.g. "experience[0].bullets[1]"
  status: "open" | "fixed" | "dismissed";
}

export interface JDRequirements {
  raw_text: string;
  parsed_requirements?: {
    matched: string[];
    promotable: string[];
    genuinely_missing: string[];
  };
}

export interface ExportRecord {
  id?: string;
  resume_id: string;
  format: "pdf" | "docx" | "txt";
  file_url?: string;
  parseability_report?: any;
  created_at?: string;
}

export interface JDRecord {
  id?: string;
  user_id?: string;
  title: string;
  text: string;
  company?: string;
  created_at?: string;
}

