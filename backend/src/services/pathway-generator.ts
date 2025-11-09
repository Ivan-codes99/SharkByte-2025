/**
 * Pathway Generation Engine
 * Core logic for generating complete educational pathways
 */

import type {
  GeneratedPathway,
  PathwayLevel,
  AlternativePathway,
  PathwayGenerationRequest,
  Institution,
  Course,
  Internship,
  Exam,
  Certification,
} from "../types";
import { getMDCProgramsForCareer, getMDCProgram } from "../data/mdc-programs";
import { getTransferTargets, getBSRequirements } from "../data/transfer-universities";
import { getGraduatePrograms, getGraduateProgram } from "../data/graduate-programs";
import { getCertificationsForCareer } from "../data/certifications";
import { enhancePathwayWithAI, generateAlternativePathways } from "../lib/gemini";
import { logger } from "../lib/logger";

/**
 * Generate a complete educational pathway for a career
 */
export async function generatePathway(
  request: PathwayGenerationRequest,
  geminiApiKey?: string
): Promise<GeneratedPathway> {
  const {
    career,
    startingInstitution = "MDC",
    targetInstitutions = ["FIU", "UF", "FSU"],
    includeGraduate = true,
    includeCertifications = true,
  } = request;

  // Step 1: Get MDC programs for the career
  logger.data("mdc", "fetch", { career });
  const mdcPrograms = await getMDCProgramsForCareer(career);
  if (mdcPrograms.length === 0) {
    logger.data("mdc", "error", { career, error: "No programs found" });
    throw new Error(`No MDC programs found for career: ${career}`);
  }
  logger.data("mdc", "fetch", { career, programsFound: mdcPrograms.length });

  // Use the first matching program (in production, could allow selection)
  const mdcProgram = mdcPrograms[0];
  // Map career to program key for transfer lookups
  const careerToProgramKey: Record<string, string> = {
    "computer scientist": "computer-science-aa",
    "software engineer": "computer-science-aa",
    "computer engineer": "computer-science-aa",
  };
  const programKey = careerToProgramKey[career.toLowerCase()] || "computer-science-aa";

  // Step 2: Build AA/AS level
  const aaLevel: PathwayLevel = {
    level: mdcProgram.degreeLevel as "AA" | "AS",
    institution: "MDC",
    programName: mdcProgram.name,
    description: mdcProgram.description,
    courses: mdcProgram.courses.map((course) => ({
      ...course,
      // Ensure courses have semester/year if not set
      semester: course.semester || "FALL",
      year: course.year || 1,
    })),
    duration: `${mdcProgram.totalCredits / 15} years`, // Approximate
    startSemester: "FALL",
    startYear: new Date().getFullYear(),
  };

  // Step 3: Get transfer targets and build BS levels
  logger.data("transfer", "fetch", { programKey, targetInstitutions });
  const transferTargets = await getTransferTargets(programKey, targetInstitutions);
  logger.data("transfer", "fetch", { programKey, targetsFound: transferTargets.length });
  const bsLevels: PathwayLevel[] = [];

  for (const target of transferTargets) {
    const bsCourses = await getBSRequirements(target.institution, target.programName);
    
    const bsLevel: PathwayLevel = {
      level: "BS",
      institution: target.institution,
      programName: target.programName,
      description: `Bachelor's degree program at ${target.institution}`,
      courses: [
        // Transfer courses (already completed at MDC)
        ...target.transferEquivalencies.map((eq) => ({
          code: eq.targetCourse,
          title: `Transferred from MDC ${eq.mdcCourse}`,
          credits: eq.credits,
        })),
        // Additional BS requirements
        ...bsCourses,
      ],
      transferTargets: [target],
      requirements: target.requirements,
      duration: "2 years", // After AA transfer
      startSemester: "FALL",
      startYear: (aaLevel.startYear || new Date().getFullYear()) + 2,
    };

    // Add internships
    bsLevel.internships = [
      {
        type: "RECOMMENDED",
        timing: "Summer after sophomore year",
        description: "Industry internship to gain practical experience",
        duration: "3 months",
      },
      {
        type: "RECOMMENDED",
        timing: "Summer after junior year",
        description: "Advanced internship or research position",
        duration: "3 months",
      },
    ];

    bsLevels.push(bsLevel);
  }

  // Step 4: Build graduate levels (MS, PhD)
  const graduateLevels: PathwayLevel[] = [];

  if (includeGraduate) {
    logger.data("graduate", "fetch", { includeGraduate: true });
    for (const target of transferTargets) {
      // MS Level
      logger.debug(`Fetching MS program for ${target.institution}`);
      const msProgram = await getGraduateProgram(target.institution, "MS");
      if (msProgram) {
        const msLevel: PathwayLevel = {
          level: "MS",
          institution: target.institution,
          programName: msProgram.programName,
          description: msProgram.description,
          courses: msProgram.coreCourses.map((c) => ({
            code: c.code,
            title: c.title,
            credits: c.credits,
          })),
          exams: msProgram.admissionRequirements.exams,
          duration: msProgram.duration,
          startSemester: "FALL",
          startYear: (bsLevels[0]?.startYear || new Date().getFullYear()) + 4,
        };
        graduateLevels.push(msLevel);

        // PhD Level
        logger.debug(`Fetching PhD program for ${target.institution}`);
        const phdProgram = await getGraduateProgram(target.institution, "PhD");
        if (phdProgram) {
          const phdLevel: PathwayLevel = {
            level: "PhD",
            institution: target.institution,
            programName: phdProgram.programName,
            description: phdProgram.description,
            courses: phdProgram.coreCourses.map((c) => ({
              code: c.code,
              title: c.title,
              credits: c.credits,
            })),
            exams: phdProgram.admissionRequirements.exams,
            duration: phdProgram.duration,
            startSemester: "FALL",
            startYear: (msLevel.startYear || new Date().getFullYear()) + 2,
          };
          graduateLevels.push(phdLevel);
        }
      }
    }
  }

  // Step 5: Add certifications
  let certifications: Certification[] = [];
  if (includeCertifications) {
    logger.data("certifications", "fetch", { career });
    certifications = await getCertificationsForCareer(career);
    logger.data("certifications", "fetch", { career, count: certifications.length });
  }

  // Add certifications to appropriate levels
  if (certifications.length > 0 && bsLevels.length > 0) {
    bsLevels[0].certifications = certifications.filter((c) => 
      !c.timing || c.timing.includes("BS") || c.timing.includes("degree")
    );
  }

  // Step 6: Build primary pathway
  const primaryPathway: PathwayLevel[] = [
    aaLevel,
    ...(bsLevels.length > 0 ? [bsLevels[0]] : []), // Use first BS level as primary
    ...graduateLevels.filter((l) => l.level === "MS" && l.institution === bsLevels[0]?.institution),
    ...graduateLevels.filter((l) => l.level === "PhD" && l.institution === bsLevels[0]?.institution),
  ];

  // Step 7: Build alternative pathways
  const alternativePathways: AlternativePathway[] = [];

  // Create alternative pathways for ALL transfer institutions
  // This ensures users can choose any transfer option, not just the primary
  if (bsLevels.length > 0) {
    // Create alternatives for all BS levels EXCEPT the primary (which is already in primaryPathway)
    // This gives users all transfer options to choose from
    for (let i = 1; i < bsLevels.length; i++) {
      const altBs = bsLevels[i];
      
      const altPathway: AlternativePathway = {
        name: `${altBs.institution} Transfer Path`,
        description: `Transfer pathway to ${altBs.institution === "FIU" ? "Florida International University" : altBs.institution === "UF" ? "University of Florida" : altBs.institution === "FSU" ? "Florida State University" : altBs.institution}`,
        levels: [
          aaLevel,
          altBs,
          ...graduateLevels.filter((l) => l.institution === altBs.institution),
        ],
      };
      alternativePathways.push(altPathway);
    }
    
    // Also ensure the primary institution is available as an explicit option
    // This allows users to see all options including the primary
    const primaryInstitution = bsLevels[0]?.institution;
    if (primaryInstitution && bsLevels.length > 1) {
      // Add primary as an alternative option too (for consistency in UI)
      const primaryAlt: AlternativePathway = {
        name: `${primaryInstitution} Transfer Path`,
        description: `Transfer pathway to ${primaryInstitution === "FIU" ? "Florida International University" : primaryInstitution === "UF" ? "University of Florida" : primaryInstitution === "FSU" ? "Florida State University" : primaryInstitution}`,
        levels: [
          aaLevel,
          bsLevels[0],
          ...graduateLevels.filter((l) => l.institution === primaryInstitution),
        ],
      };
      // Only add if not already in alternatives (to avoid duplicates)
      if (!alternativePathways.some(alt => alt.levels[1]?.institution === primaryInstitution)) {
        alternativePathways.unshift(primaryAlt); // Add at beginning
      }
    }
  }

  // Step 8: Generate AI-enhanced alternative pathways if API key provided
  if (geminiApiKey) {
    try {
      logger.ai("request", { operation: "generate_alternatives", career });
      const aiAlternatives = await generateAlternativePathways(
        career,
        primaryPathway,
        geminiApiKey
      );
      logger.ai("response", { operation: "generate_alternatives", alternativesGenerated: aiAlternatives.length });
      alternativePathways.push(...aiAlternatives);
    } catch (error) {
      logger.ai("error", { operation: "generate_alternatives", career });
      logger.error("Failed to generate AI alternatives", error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Step 9: Build final pathway object
  const generatedPathway: GeneratedPathway = {
    career,
    primaryPathway,
    alternativePathways,
    totalDuration: calculateTotalDuration(primaryPathway),
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "SharkScholar Backend",
      aiEnhanced: !!geminiApiKey,
    },
  };

  // Step 10: Enhance with AI if API key provided
  if (geminiApiKey) {
    try {
      logger.pathway("enhance", career);
      logger.ai("request", { operation: "enhance_pathway", career });
      const enhanced = await enhancePathwayWithAI(generatedPathway, geminiApiKey);
      logger.ai("enhance", { career });
      return enhanced;
    } catch (error) {
      logger.ai("error", { operation: "enhance_pathway", career });
      logger.error("Failed to enhance pathway with AI", error instanceof Error ? error : new Error(String(error)));
      return generatedPathway;
    }
  }

  return generatedPathway;
}

/**
 * Calculate total duration of a pathway
 */
function calculateTotalDuration(levels: PathwayLevel[]): string {
  let totalYears = 0;

  for (const level of levels) {
    if (level.duration) {
      const match = level.duration.match(/(\d+)/);
      if (match) {
        totalYears += parseInt(match[1]);
      }
    } else {
      // Default estimates
      if (level.level === "AA" || level.level === "AS") totalYears += 2;
      else if (level.level === "BS" || level.level === "BA") totalYears += 2; // After AA
      else if (level.level === "MS" || level.level === "MA") totalYears += 2;
      else if (level.level === "PhD") totalYears += 5;
    }
  }

  return `${totalYears} years`;
}

