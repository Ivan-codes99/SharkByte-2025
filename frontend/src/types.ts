export type MilestoneStatus = "PLANNED" | "IN_PROGRESS" | "DONE";

export type Semester = "FALL" | "SPRING" | "SUMMER";

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

