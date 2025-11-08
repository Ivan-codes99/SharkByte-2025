/**
 * MDC Program Data Aggregation
 * This module contains curated MDC program data and functions to fetch/parse program information
 */

import type { Program, Course, Institution } from "../types";
import { logger } from "../lib/logger";

/**
 * Sample MDC Computer Science/Engineering programs
 * In production, this would be fetched from MDC's official catalog API or scraped
 */
export const mdcPrograms: Record<string, Program> = {
  "computer-science-aa": {
    name: "Associate in Arts - Computer Science",
    description: "Transfer program preparing students for Computer Science bachelor's degree",
    institution: "MDC",
    degreeLevel: "AA",
    totalCredits: 60,
    courses: [
      // Year 1 - Fall
      {
        code: "ENC1101",
        title: "English Composition I",
        credits: 3,
        semester: "FALL",
        year: 1,
      },
      {
        code: "MAC2311",
        title: "Calculus I",
        credits: 4,
        semester: "FALL",
        year: 1,
        prerequisites: ["MAC1105"],
      },
      {
        code: "COP2271",
        title: "Introduction to Programming in C++",
        credits: 3,
        semester: "FALL",
        year: 1,
      },
      {
        code: "CHM1045",
        title: "General Chemistry I",
        credits: 3,
        semester: "FALL",
        year: 1,
      },
      {
        code: "CHM1045L",
        title: "General Chemistry I Lab",
        credits: 1,
        semester: "FALL",
        year: 1,
        corequisite: "CHM1045",
      },
      // Year 1 - Spring
      {
        code: "ENC1102",
        title: "English Composition II",
        credits: 3,
        semester: "SPRING",
        year: 1,
        prerequisites: ["ENC1101"],
      },
      {
        code: "MAC2312",
        title: "Calculus II",
        credits: 4,
        semester: "SPRING",
        year: 1,
        prerequisites: ["MAC2311"],
      },
      {
        code: "COP2274",
        title: "Object-Oriented Programming in C++",
        credits: 3,
        semester: "SPRING",
        year: 1,
        prerequisites: ["COP2271"],
      },
      {
        code: "PHY2048",
        title: "Physics I with Calculus",
        credits: 3,
        semester: "SPRING",
        year: 1,
        prerequisites: ["MAC2311"],
      },
      {
        code: "PHY2048L",
        title: "Physics I Lab",
        credits: 1,
        semester: "SPRING",
        year: 1,
        corequisite: "PHY2048",
      },
      // Year 2 - Fall
      {
        code: "MAC2313",
        title: "Calculus III",
        credits: 4,
        semester: "FALL",
        year: 2,
        prerequisites: ["MAC2312"],
      },
      {
        code: "COP3330",
        title: "Object-Oriented Programming",
        credits: 3,
        semester: "FALL",
        year: 2,
        prerequisites: ["COP2274"],
      },
      {
        code: "PHY2049",
        title: "Physics II with Calculus",
        credits: 3,
        semester: "FALL",
        year: 2,
        prerequisites: ["PHY2048"],
      },
      {
        code: "PHY2049L",
        title: "Physics II Lab",
        credits: 1,
        semester: "FALL",
        year: 2,
        corequisite: "PHY2049",
      },
      {
        code: "STA2023",
        title: "Statistical Methods",
        credits: 3,
        semester: "FALL",
        year: 2,
        prerequisites: ["MAC1105"],
      },
      // Year 2 - Spring
      {
        code: "COT3100",
        title: "Applied Discrete Structures",
        credits: 3,
        semester: "SPRING",
        year: 2,
        prerequisites: ["MAC2311"],
      },
      {
        code: "COP3530",
        title: "Data Structures and Algorithms",
        credits: 3,
        semester: "SPRING",
        year: 2,
        prerequisites: ["COP3330"],
      },
      // General Education courses (distributed across semesters)
      {
        code: "HUM1020",
        title: "Introduction to Humanities",
        credits: 3,
      },
      {
        code: "SPC1017",
        title: "Fundamentals of Speech Communication",
        credits: 3,
      },
      {
        code: "POS2041",
        title: "American Federal Government",
        credits: 3,
      },
    ],
    requirements: {
      gpa: 2.0,
    },
  },
};

/**
 * Fetch MDC program data
 * In production, this would fetch from MDC's API or database
 */
export async function getMDCProgram(programKey: string): Promise<Program | null> {
  logger.data("mdc", "fetch", { programKey });
  const program = mdcPrograms[programKey] || null;
  
  if (program) {
    logger.debug("MDC program found", { programKey, programName: program.name });
  } else {
    logger.warn("MDC program not found", { programKey });
  }
  
  return program;
}

/**
 * Get all available MDC programs for a career
 */
export async function getMDCProgramsForCareer(career: string): Promise<Program[]> {
  logger.data("mdc", "fetch", { career });
  
  // Map careers to MDC programs
  const careerToPrograms: Record<string, string[]> = {
    "computer scientist": ["computer-science-aa"],
    "software engineer": ["computer-science-aa"],
    "computer engineer": ["computer-science-aa"],
    "mechanical engineer": ["engineering-aa"], // Would need to add this
    "architect": ["architecture-aa"], // Would need to add this
  };

  const programKeys = careerToPrograms[career.toLowerCase()] || ["computer-science-aa"];
  logger.debug("Looking up MDC programs for career", { career, programKeys });
  
  const programs: Program[] = [];

  for (const key of programKeys) {
    const program = await getMDCProgram(key);
    if (program) {
      programs.push(program);
    }
  }

  logger.info("MDC programs found for career", { career, count: programs.length });
  return programs;
}

