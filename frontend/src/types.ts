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

