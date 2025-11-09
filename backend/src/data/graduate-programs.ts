/**
 * Graduate Program Data (MS, PhD)
 * Contains requirements and information for graduate programs
 */

import type { Program, Exam, Institution } from "../types";
import { logger } from "../lib/logger";

export interface GraduateProgram {
  institution: Institution;
  level: "MS" | "PhD";
  programName: string;
  description: string;
  admissionRequirements: {
    gpa: number;
    exams: Exam[];
    prerequisites?: string[];
    lettersOfRecommendation?: number;
    statementOfPurpose?: boolean;
  };
  coreCourses: {
    code: string;
    title: string;
    credits: number;
  }[];
  duration: string; // e.g., "2 years", "4-6 years"
  researchAreas?: string[];
}

/**
 * Sample graduate programs
 */
export const graduatePrograms: Record<string, GraduateProgram> = {
  "FIU-MS-CS": {
    institution: "FIU",
    level: "MS",
    programName: "Master of Science in Computer Science",
    description: "Advanced study in computer science with thesis or non-thesis options",
    admissionRequirements: {
      gpa: 3.0,
      exams: [
        {
          name: "GRE",
          description: "Graduate Record Examination",
          required: true,
          timing: "Before MS admission",
          scoreRequirements: {
            minimum: 300,
            recommended: 310,
          },
        },
      ],
      prerequisites: ["BS in Computer Science or equivalent"],
      lettersOfRecommendation: 3,
      statementOfPurpose: true,
    },
    coreCourses: [
      {
        code: "COT5405",
        title: "Analysis of Algorithms",
        credits: 3,
      },
      {
        code: "COT5420",
        title: "Advanced Operating Systems",
        credits: 3,
      },
      {
        code: "COT5930",
        title: "Special Topics in Computer Science",
        credits: 3,
      },
    ],
    duration: "2 years",
    researchAreas: [
      "Artificial Intelligence",
      "Machine Learning",
      "Distributed Systems",
      "Cybersecurity",
    ],
  },
  "FIU-PhD-CS": {
    institution: "FIU",
    level: "PhD",
    programName: "Doctor of Philosophy in Computer Science",
    description: "Research-focused doctoral program in computer science",
    admissionRequirements: {
      gpa: 3.5,
      exams: [
        {
          name: "GRE",
          description: "Graduate Record Examination",
          required: true,
          timing: "Before PhD admission",
          scoreRequirements: {
            minimum: 310,
            recommended: 320,
          },
        },
      ],
      prerequisites: ["MS in Computer Science or equivalent"],
      lettersOfRecommendation: 3,
      statementOfPurpose: true,
    },
    coreCourses: [],
    duration: "4-6 years",
    researchAreas: [
      "Artificial Intelligence",
      "Machine Learning",
      "Distributed Systems",
      "Cybersecurity",
      "Data Science",
    ],
  },
};

/**
 * Get graduate program information
 */
export async function getGraduateProgram(
  institution: Institution,
  level: "MS" | "PhD",
  field: string = "CS"
): Promise<GraduateProgram | null> {
  logger.data("graduate", "fetch", { institution, level, field });
  const key = `${institution}-${level}-${field}`;
  const program = graduatePrograms[key] || null;
  
  if (program) {
    logger.debug("Graduate program found", { institution, level, field, programName: program.programName });
  } else {
    logger.warn("Graduate program not found", { institution, level, field });
  }
  
  return program;
}

/**
 * Get all graduate programs for an institution
 */
export async function getGraduatePrograms(
  institution: Institution,
  field: string = "CS"
): Promise<GraduateProgram[]> {
  logger.data("graduate", "fetch", { institution, field, all: true });
  
  const ms = await getGraduateProgram(institution, "MS", field);
  const phd = await getGraduateProgram(institution, "PhD", field);

  const programs: GraduateProgram[] = [];
  if (ms) programs.push(ms);
  if (phd) programs.push(phd);

  logger.info("Graduate programs found", { institution, field, count: programs.length });
  return programs;
}

