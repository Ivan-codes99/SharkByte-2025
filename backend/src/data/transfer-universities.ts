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
      // Year 3 - Fall
      {
        code: "COP3530",
        title: "Data Structures",
        credits: 3,
        semester: "FALL",
        year: 3,
        prerequisites: ["COP3337"],
      },
      {
        code: "CDA3103",
        title: "Computer Organization",
        credits: 3,
        semester: "FALL",
        year: 3,
        prerequisites: ["COP3337"],
      },
      {
        code: "COT4210",
        title: "Theory of Computation",
        credits: 3,
        semester: "FALL",
        year: 3,
        prerequisites: ["COT3100"],
      },
      {
        code: "COP3402",
        title: "Systems Software",
        credits: 3,
        semester: "FALL",
        year: 3,
        prerequisites: ["CDA3103"],
      },
      // Year 3 - Spring
      {
        code: "COT4400",
        title: "Analysis of Algorithms",
        credits: 3,
        semester: "SPRING",
        year: 3,
        prerequisites: ["COP3530", "COT3100"],
      },
      {
        code: "COP4610",
        title: "Operating Systems",
        credits: 3,
        semester: "SPRING",
        year: 3,
        prerequisites: ["CDA3103", "COP3530"],
      },
      {
        code: "CEN4010",
        title: "Software Engineering",
        credits: 3,
        semester: "SPRING",
        year: 3,
        prerequisites: ["COP3530"],
      },
      {
        code: "CNT4713",
        title: "Computer Networks",
        credits: 3,
        semester: "SPRING",
        year: 3,
        prerequisites: ["COP3530"],
      },
      // Year 4 - Fall
      {
        code: "CAP4630",
        title: "Artificial Intelligence",
        credits: 3,
        semester: "FALL",
        year: 4,
        prerequisites: ["COP3530", "COT4400"],
      },
      {
        code: "CIS4911",
        title: "Senior Project I",
        credits: 3,
        semester: "FALL",
        year: 4,
        prerequisites: ["CEN4010"],
      },
      // Year 4 - Spring
      {
        code: "CIS4912",
        title: "Senior Project II",
        credits: 3,
        semester: "SPRING",
        year: 4,
        prerequisites: ["CIS4911"],
      },
      // CS Elective Group - Choose 2 of 5
      {
        code: "CAP4770",
        title: "Data Mining",
        credits: 3,
        semester: "FALL",
        year: 4,
        prerequisites: ["COP3530"],
        description: "CS elective option",
      },
      {
        code: "CAP4720",
        title: "Computer Graphics",
        credits: 3,
        semester: "FALL",
        year: 4,
        prerequisites: ["COP3530"],
        description: "CS elective option",
      },
      {
        code: "CNT4406",
        title: "Network Security",
        credits: 3,
        semester: "SPRING",
        year: 4,
        prerequisites: ["CNT4713"],
        description: "CS elective option",
      },
      {
        code: "COP4520",
        title: "Parallel and Distributed Computing",
        credits: 3,
        semester: "SPRING",
        year: 4,
        prerequisites: ["COP4610"],
        description: "CS elective option",
      },
      {
        code: "CEN4721",
        title: "Human-Computer Interaction",
        credits: 3,
        semester: "FALL",
        year: 4,
        prerequisites: ["CEN4010"],
        description: "CS elective option",
      },
    ],
    "UF-BS-CS": [
      // Year 3 - Fall
      {
        code: "COP3503",
        title: "Programming Fundamentals 2",
        credits: 3,
        semester: "FALL",
        year: 3,
        prerequisites: ["COP3502"],
      },
      {
        code: "COT3100",
        title: "Applications of Discrete Structures",
        credits: 3,
        semester: "FALL",
        year: 3,
        prerequisites: ["MAC2312"],
      },
      {
        code: "CDA3101",
        title: "Introduction to Computer Organization",
        credits: 3,
        semester: "FALL",
        year: 3,
        prerequisites: ["COP3502"],
      },
      // Year 3 - Spring
      {
        code: "COP3530",
        title: "Data Structures and Algorithm Analysis",
        credits: 3,
        semester: "SPRING",
        year: 3,
        prerequisites: ["COP3503"],
      },
      {
        code: "COP4600",
        title: "Operating Systems",
        credits: 3,
        semester: "SPRING",
        year: 3,
        prerequisites: ["CDA3101", "COP3530"],
      },
      // Year 4 - Fall
      {
        code: "COT4501",
        title: "Numerical Analysis",
        credits: 3,
        semester: "FALL",
        year: 4,
        prerequisites: ["COP3530"],
      },
      {
        code: "CEN4502",
        title: "Software Engineering",
        credits: 3,
        semester: "FALL",
        year: 4,
        prerequisites: ["COP3530"],
      },
    ],
    "FSU-BS-CS": [
      // Year 3 - Fall
      {
        code: "COP3014",
        title: "Foundations of Computer Science",
        credits: 3,
        semester: "FALL",
        year: 3,
        prerequisites: ["COP2271"],
      },
      {
        code: "CDA3100",
        title: "Computer Organization I",
        credits: 3,
        semester: "FALL",
        year: 3,
        prerequisites: ["COP3014"],
      },
      {
        code: "COP3358",
        title: "Object-Oriented Programming",
        credits: 3,
        semester: "FALL",
        year: 3,
        prerequisites: ["COP3014"],
      },
      // Year 3 - Spring
      {
        code: "COP4530",
        title: "Data Structures, Algorithms, and Generic Programming",
        credits: 3,
        semester: "SPRING",
        year: 3,
        prerequisites: ["COP3358"],
      },
      {
        code: "COP4610",
        title: "Operating Systems and Concurrent Programming",
        credits: 3,
        semester: "SPRING",
        year: 3,
        prerequisites: ["CDA3100", "COP4530"],
      },
    ],
  };

  const key = `${institution}-BS-CS`;
  const courses = requirements[key] || [];
  
  logger.debug("BS requirements found", { institution, programName, courseCount: courses.length });
  return courses;
}

