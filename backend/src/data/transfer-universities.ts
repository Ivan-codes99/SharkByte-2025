/**
 * Transfer University Data
 * Contains transfer information for FIU, UF, FSU, etc.
 */

import type { TransferTarget, Institution, Course } from "../types";
import { logger } from "../lib/logger";

/**
 * Transfer targets for Computer Science from MDC
 */
export const transferTargets: Record<string, TransferTarget[]> = {
  "computer-science-aa": [
    {
      institution: "FIU",
      programName: "Bachelor of Science in Computer Science",
      articulationAgreement: true,
      transferEquivalencies: [
        { mdcCourse: "COP2271", targetCourse: "COP2210", credits: 3 },
        { mdcCourse: "COP2274", targetCourse: "COP3337", credits: 3 },
        { mdcCourse: "COP3330", targetCourse: "COP3337", credits: 3 },
        { mdcCourse: "COP3530", targetCourse: "COP3530", credits: 3 },
        { mdcCourse: "MAC2311", targetCourse: "MAC2311", credits: 4 },
        { mdcCourse: "MAC2312", targetCourse: "MAC2312", credits: 4 },
        { mdcCourse: "MAC2313", targetCourse: "MAC2313", credits: 4 },
        { mdcCourse: "PHY2048", targetCourse: "PHY2048", credits: 3 },
        { mdcCourse: "PHY2049", targetCourse: "PHY2049", credits: 3 },
        { mdcCourse: "STA2023", targetCourse: "STA3033", credits: 3 },
        { mdcCourse: "COT3100", targetCourse: "COT3100", credits: 3 },
      ],
      requirements: {
        gpa: 2.5,
        prerequisites: ["MAC2311", "COP2271"],
        additionalCourses: [
          {
            code: "COP2210",
            title: "Programming I",
            credits: 3,
            prerequisites: ["MAC2311"],
          },
          {
            code: "COP3337",
            title: "Object-Oriented Programming",
            credits: 3,
            prerequisites: ["COP2210"],
          },
        ],
      },
    },
    {
      institution: "UF",
      programName: "Bachelor of Science in Computer Science",
      articulationAgreement: true,
      transferEquivalencies: [
        { mdcCourse: "COP2271", targetCourse: "COP3502", credits: 3 },
        { mdcCourse: "MAC2311", targetCourse: "MAC2311", credits: 4 },
        { mdcCourse: "MAC2312", targetCourse: "MAC2312", credits: 4 },
        { mdcCourse: "MAC2313", targetCourse: "MAC2313", credits: 4 },
        { mdcCourse: "PHY2048", targetCourse: "PHY2048", credits: 3 },
        { mdcCourse: "PHY2049", targetCourse: "PHY2049", credits: 3 },
      ],
      requirements: {
        gpa: 3.0,
        prerequisites: ["MAC2311", "COP2271"],
      },
    },
    {
      institution: "FSU",
      programName: "Bachelor of Science in Computer Science",
      articulationAgreement: true,
      transferEquivalencies: [
        { mdcCourse: "COP2271", targetCourse: "COP3014", credits: 3 },
        { mdcCourse: "MAC2311", targetCourse: "MAC2311", credits: 4 },
        { mdcCourse: "MAC2312", targetCourse: "MAC2312", credits: 4 },
      ],
      requirements: {
        gpa: 2.75,
        prerequisites: ["MAC2311"],
      },
    },
  ],
};

/**
 * Get transfer targets for an MDC program
 */
export async function getTransferTargets(
  mdcProgramKey: string,
  targetInstitutions?: Institution[]
): Promise<TransferTarget[]> {
  logger.data("transfer", "fetch", { mdcProgramKey, targetInstitutions });
  
  const allTargets = transferTargets[mdcProgramKey] || [];
  logger.debug("Transfer targets found", { mdcProgramKey, count: allTargets.length });

  if (targetInstitutions && targetInstitutions.length > 0) {
    const filtered = allTargets.filter((target) => targetInstitutions.includes(target.institution));
    logger.debug("Filtered transfer targets", { 
      mdcProgramKey, 
      requested: targetInstitutions, 
      found: filtered.length 
    });
    return filtered;
  }

  return allTargets;
}

/**
 * Get BS degree requirements for a transfer institution
 */
export async function getBSRequirements(
  institution: Institution,
  programName: string
): Promise<Course[]> {
  logger.data("transfer", "fetch", { institution, programName, type: "bs_requirements" });
  
  // In production, this would fetch from university catalogs
  // For now, return sample data
  const requirements: Record<string, Course[]> = {
    "FIU-BS-CS": [
      {
        code: "COP3530",
        title: "Data Structures",
        credits: 3,
        prerequisites: ["COP3337"],
      },
      {
        code: "CDA3103",
        title: "Computer Organization",
        credits: 3,
        prerequisites: ["COP3337"],
      },
      {
        code: "COT4400",
        title: "Analysis of Algorithms",
        credits: 3,
        prerequisites: ["COP3530", "COT3100"],
      },
      {
        code: "COP4610",
        title: "Operating Systems",
        credits: 3,
        prerequisites: ["CDA3103", "COP3530"],
      },
      {
        code: "CEN4010",
        title: "Software Engineering",
        credits: 3,
        prerequisites: ["COP3530"],
      },
    ],
  };

  const key = `${institution}-BS-CS`;
  const courses = requirements[key] || [];
  
  logger.debug("BS requirements found", { institution, programName, courseCount: courses.length });
  return courses;
}

