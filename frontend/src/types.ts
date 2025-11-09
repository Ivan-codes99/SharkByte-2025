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
  credits?: number; // Number of credits for this course
  countsTowardRequired?: boolean; // Whether this course counts toward required credits (true for required courses, false for optional elective options)
  // New fields for tree structure and interactivity
  category?: MilestoneCategory; // Visual categorization
  groupId?: string; // The requirement group this course belongs to
  groupName?: string; // Display name of the requirement group
  requiredCredits?: number; // Required credits for this group
  selected?: boolean; // For user-selected courses in groups with multiple options
  requiredCount?: number; // For groups: "choose X of Y" courses
  totalOptions?: number; // Total options in a group
  children?: Milestone[]; // For tree structure (e.g., groups with options)
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

export type ClassStanding = "FRESHMAN" | "SOPHOMORE" | "JUNIOR" | "SENIOR" | "GRADUATE" | "OTHER";

export type RaceEthnicity = 
  | "AMERICAN_INDIAN_OR_ALASKA_NATIVE"
  | "ASIAN"
  | "BLACK_OR_AFRICAN_AMERICAN"
  | "HISPANIC_OR_LATINO"
  | "NATIVE_HAWAIIAN_OR_PACIFIC_ISLANDER"
  | "WHITE"
  | "TWO_OR_MORE_RACES"
  | "PREFER_NOT_TO_SAY"
  | "OTHER";

export interface StudentInfo {
  // Basic Information
  name: string;
  email?: string;
  phone?: string;
  
  // Academic Information
  classStanding?: ClassStanding;
  program?: string;
  gpa?: number;
  institution?: string;
  
  // Demographic Information (for scholarship eligibility)
  raceEthnicity?: RaceEthnicity;
  isFirstGeneration?: boolean;
  isVeteran?: boolean;
  isInternationalStudent?: boolean;
  
  // Additional Information
  achievements?: string;
  workExperience?: string;
  extracurricularActivities?: string;
  careerGoals?: string;
  financialNeed?: string;
  
  // Documents
  transcriptFile?: {
    name: string;
    data: string; // Base64 encoded file data
    uploadedAt: string;
  };
  resumeFile?: {
    name: string;
    data: string; // Base64 encoded file data
    uploadedAt: string;
  };
  
  // Metadata
  lastUpdated: string;
}