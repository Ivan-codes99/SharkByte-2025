export type MilestoneStatus = "PLANNED" | "IN_PROGRESS" | "DONE";

export type Semester = "FALL" | "SPRING" | "SUMMER";

export type MilestoneCategory = "CORE" | "ELECTIVE" | "DEGREE";

export type Milestone = {
  id: string;
  title: string;
  kind: "COURSE" | "CERT" | "INTERNSHIP" | "EXTRACURRICULAR";
  targetDate?: string;
  // Semester-based scheduling (alternative to targetDate)
  semester?: Semester;
  year?: number;
  status: MilestoneStatus;
  description?: string;
  // New fields for tree structure and interactivity
  category?: MilestoneCategory; // Visual categorization
  electiveGroupId?: string; // For grouping elective courses
  isElective?: boolean; // Whether this is an elective course
  selected?: boolean; // For user-selected electives
  requiredCount?: number; // For elective groups: "choose X of Y"
  totalOptions?: number; // Total options in an elective group
  children?: Milestone[]; // For tree structure (e.g., elective groups with options)
};

export type Scholarship = {
  id: string;
  title: string;
  awardUSD: number;
  deadlineISO: string;
  programTags: string[];
  essayWords?: number;
  url?: string;
  blurb: string;
};

export type DegreeLevel = "AA" | "AS" | "BS" | "BA" | "MS" | "MA" | "PhD" | "CERT";
export type Institution = "MDC" | "FIU" | "UF" | "FSU" | "OTHER";

export interface ProgramCourse {
  code: string; // Course code (e.g., "COP2271") or pattern (e.g., "CAI*", "CAP*")
  title?: string; // Optional - not needed for pattern codes
  credits?: number; // Optional - not needed for pattern codes
  prerequisites?: string[];
  corequisite?: string;
  description?: string;
  semester?: Semester;
  year?: number;
}

export interface RequirementGroup {
  name: string; // e.g., "GENERAL EDUCATION REQUIREMENTS", "COMMUNICATIONS", "ORAL COMMUNICATIONS", etc.
  requiredCredits: number; // Number of credits needed from this group
  courses?: ProgramCourse[]; // List of courses that can satisfy this requirement (if this is a leaf group)
  groups?: RequirementGroup[]; // Nested subgroups (if this is a parent group)
  description?: string; // Optional description or notes (e.g., "Any transferrable type-1 or type-2 courses")
}

export interface ProgramRequirements {
  groups: RequirementGroup[]; // Top-level requirement groups (can contain nested groups)
}

export interface ProgramCertification {
  name: string;
  description: string;
  required: boolean;
  timing?: string;
  prerequisites?: string[];
}

export interface ProgramExam {
  name: string;
  description: string;
  required: boolean;
  timing?: string;
  scoreRequirements?: {
    minimum?: number;
    recommended?: number;
  };
}

export interface ProgramInternship {
  type: "REQUIRED" | "OPTIONAL" | "RECOMMENDED";
  timing: string;
  description: string;
  duration?: string;
}

export interface ProgramAnalysisResponse {
  degreeType: DegreeLevel;
  programName: string;
  institution: Institution;
  metadata: {
    totalCredits?: number;
    duration?: string;
    description?: string;
  };
  requirements: ProgramRequirements;
  certifications?: {
    required: ProgramCertification[];
    recommended: ProgramCertification[];
  };
  exams?: ProgramExam[];
  internships?: ProgramInternship[];
}

