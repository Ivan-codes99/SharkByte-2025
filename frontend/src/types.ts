export type MilestoneStatus = "PLANNED" | "IN_PROGRESS" | "DONE";

export type Milestone = {
  id: string;
  title: string;
  kind: "COURSE" | "CERT" | "INTERNSHIP";
  targetDate?: string;
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

