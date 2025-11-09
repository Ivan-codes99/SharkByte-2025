/**
 * Convert backend pathway data to frontend milestones
 */

import type { GeneratedPathway, PathwayLevel, Course } from "../types/pathway";
import type { Milestone, MilestoneStatus } from "../types";
import { semesterToDate } from "./semester";

/**
 * Convert a pathway level to milestones
 */
function pathwayLevelToMilestones(
  level: PathwayLevel,
  baseYear: number,
  levelIndex: number
): Milestone[] {
  const milestones: Milestone[] = [];
  const levelStartYear = level.startYear || baseYear + levelIndex * 2;
  const levelStartSemester = level.startSemester || "FALL";

  // Group courses by semester to distribute them properly
  const coursesBySemester: Record<string, Course[]> = {};
  let semesterCounter = 0; // Track which semester we're in (0 = first, 1 = second, etc.)

  level.courses.forEach((course) => {
    // If course has explicit year and semester, use them
    // Note: course.year might be relative (1, 2) or absolute (2024, 2025)
    // If it's < 2000, treat it as relative year within the level
    if (course.year && course.semester) {
      let courseYear: number;
      if (course.year < 2000) {
        // Relative year (1, 2, etc.) - convert to absolute year
        // Year 1 = levelStartYear, Year 2 = levelStartYear + 1, etc.
        courseYear = levelStartYear + (course.year - 1);
      } else {
        // Absolute year
        courseYear = course.year;
      }
      
      const key = `${courseYear}-${course.semester}`;
      if (!coursesBySemester[key]) {
        coursesBySemester[key] = [];
      }
      coursesBySemester[key].push(course);
    } else {
      // Distribute courses across semesters within the level
      // Calculate which academic year we're in (0 = first year, 1 = second year, etc.)
      const academicYear = Math.floor(semesterCounter / 3);
      const semesterInYear = semesterCounter % 3;
      
      // Determine the actual calendar year
      // If starting in Fall, year stays the same for Fall/Spring/Summer
      // If starting in Spring, Fall of next academic year is next calendar year
      let courseYear = levelStartYear;
      if (levelStartSemester === "SPRING" || levelStartSemester === "SUMMER") {
        // If starting mid-year, first academic year spans two calendar years
        if (semesterInYear === 0) {
          // First semester (Spring/Summer) is in start year
          courseYear = levelStartYear;
        } else if (semesterInYear === 1) {
          // Second semester (Summer/Fall) might be in start year or next
          courseYear = levelStartYear;
        } else {
          // Third semester wraps to next calendar year
          courseYear = levelStartYear + academicYear;
        }
      } else {
        // Starting in Fall - each academic year is one calendar year
        courseYear = levelStartYear + academicYear;
      }
      
      let courseSemester: "FALL" | "SPRING" | "SUMMER";
      
      if (course.semester) {
        courseSemester = course.semester;
      } else {
        // Start with the level's start semester, then rotate through Fall, Spring, Summer
        const semesterOrder: ("FALL" | "SPRING" | "SUMMER")[] = ["FALL", "SPRING", "SUMMER"];
        const startIndex = semesterOrder.indexOf(levelStartSemester);
        const semesterIndex = (startIndex + semesterInYear) % 3;
        courseSemester = semesterOrder[semesterIndex];
      }

      const key = `${courseYear}-${courseSemester}`;
      if (!coursesBySemester[key]) {
        coursesBySemester[key] = [];
      }
      coursesBySemester[key].push(course);
      semesterCounter++;
    }
  });

  // Convert grouped courses to milestones
  Object.entries(coursesBySemester).forEach(([key, courses]) => {
    const [yearStr, semester] = key.split("-");
    const year = parseInt(yearStr, 10);
    
    // Validate year is reasonable (between 2020 and 2100)
    if (isNaN(year) || year < 2020 || year > 2100) {
      console.warn(`Invalid year ${year} for course, using level start year ${levelStartYear}`);
      return;
    }

    courses.forEach((course, index) => {
      // Determine category: CORE for required courses (CS, Math, Physics, Chemistry)
      // This is a simple heuristic - in production, this would come from backend data
      const isCore = course.code.startsWith("COP") || course.code.startsWith("MAC") || 
                     course.code.startsWith("PHY") || course.code.startsWith("CHM") ||
                     course.code.startsWith("COT") || course.code.startsWith("STA");
      // Only mark as CORE if it's a core course, otherwise leave category undefined
      const category = isCore ? "CORE" : undefined;
      
      // Check if this is an elective course (by description or course code pattern)
      const isHumanitiesElective = course.description?.toLowerCase().includes("humanities elective") || 
                                    course.code.startsWith("ARH") || course.code.startsWith("LIT") ||
                                    course.code.startsWith("PHI") || course.code.startsWith("THE");
      const isCSElective = course.description?.toLowerCase().includes("cs elective") ||
                            course.description?.toLowerCase().includes("elective option") && 
                            (course.code.startsWith("CAP") || course.code.startsWith("CNT") || 
                             course.code.startsWith("COP") || course.code.startsWith("CEN"));
      const isElective = isHumanitiesElective || isCSElective;
      const electiveGroupId = isHumanitiesElective ? "humanities-electives" : 
                              isCSElective ? "cs-electives" : undefined;
      
      milestones.push({
        id: `course-${level.level}-${level.institution}-${course.code}-${key}-${index}`,
        title: `${course.code}: ${course.title}`,
        kind: "COURSE",
        semester: semester as "FALL" | "SPRING" | "SUMMER",
        year: year,
        targetDate: semesterToDate(semester as "FALL" | "SPRING" | "SUMMER", year),
        status: "PLANNED" as MilestoneStatus,
        description: course.description || `${course.credits} credits${course.prerequisites ? `. Prerequisites: ${course.prerequisites.join(", ")}` : ""}`,
        category: category as "CORE" | undefined,
        isElective: isElective,
        electiveGroupId: electiveGroupId,
        requiredCount: isHumanitiesElective ? 2 : isCSElective ? 2 : undefined, // Choose 2 of each elective group
      });
    });
  });

  // Add internships as milestones
  level.internships?.forEach((internship, index) => {
    // Parse timing to determine year/semester
    const timingYear = parseTimingYear(internship.timing, levelStartYear);
    const timingSemester = parseTimingSemester(internship.timing) || "SUMMER";
    
    // Validate year
    const validYear = (timingYear >= 2020 && timingYear <= 2100) ? timingYear : levelStartYear;
    
    milestones.push({
      id: `internship-${level.level}-${level.institution}-${index}`,
      title: `Internship: ${internship.type}`,
      kind: "INTERNSHIP",
      semester: timingSemester,
      year: validYear,
      targetDate: semesterToDate(timingSemester, validYear),
      status: "PLANNED" as MilestoneStatus,
      description: `${internship.description}${internship.duration ? ` (${internship.duration})` : ""}`,
    });
  });

  // Add exams as milestones
  level.exams?.forEach((exam, index) => {
    const examYear = parseTimingYear(exam.timing || "", levelStartYear);
    const examSemester = parseTimingSemester(exam.timing || "") || "SPRING";
    
    // Validate year
    const validYear = (examYear >= 2020 && examYear <= 2100) ? examYear : levelStartYear;
    
    milestones.push({
      id: `exam-${level.level}-${level.institution}-${exam.name}-${index}`,
      title: exam.name,
      kind: "CERT",
      semester: examSemester,
      year: validYear,
      targetDate: semesterToDate(examSemester, validYear),
      status: "PLANNED" as MilestoneStatus,
      description: exam.description + (exam.scoreRequirements?.minimum ? ` (Minimum score: ${exam.scoreRequirements.minimum})` : ""),
    });
  });

  // Add certifications as milestones
  level.certifications?.forEach((cert, index) => {
    const certYear = parseTimingYear(cert.timing || "", levelStartYear);
    const certSemester = parseTimingSemester(cert.timing || "") || "SUMMER";
    
    // Validate year
    const validYear = (certYear >= 2020 && certYear <= 2100) ? certYear : levelStartYear;
    
    milestones.push({
      id: `cert-${level.level}-${level.institution}-${cert.name}-${index}`,
      title: cert.name,
      kind: "CERT",
      semester: certSemester,
      year: validYear,
      targetDate: semesterToDate(certSemester, validYear),
      status: "PLANNED" as MilestoneStatus,
      description: cert.description,
    });
  });

  return milestones;
}

/**
 * Parse year from timing string (e.g., "Summer after sophomore year" -> year + 2)
 */
function parseTimingYear(timing: string, baseYear: number): number {
  if (!timing || timing.trim() === "") {
    return baseYear;
  }
  
  const lower = timing.toLowerCase();
  if (lower.includes("freshman") || lower.includes("first year")) return baseYear;
  if (lower.includes("sophomore") || lower.includes("second year")) return baseYear + 1;
  if (lower.includes("junior") || lower.includes("third year")) return baseYear + 2;
  if (lower.includes("senior") || lower.includes("fourth year")) return baseYear + 3;
  if (lower.includes("after graduation") || lower.includes("after bs")) return baseYear + 2;
  if (lower.includes("after ms")) return baseYear + 4;
  
  // Default to base year if no match
  return baseYear;
}

/**
 * Parse semester from timing string
 */
function parseTimingSemester(timing: string): "FALL" | "SPRING" | "SUMMER" | undefined {
  const lower = timing.toLowerCase();
  if (lower.includes("fall")) return "FALL";
  if (lower.includes("spring")) return "SPRING";
  if (lower.includes("summer")) return "SUMMER";
  return undefined;
}

/**
 * Convert a generated pathway to milestones
 */
export function pathwayToMilestones(pathway: GeneratedPathway, useAlternativePathway?: number): Milestone[] {
  const levels = useAlternativePathway !== undefined 
    ? pathway.alternativePathways[useAlternativePathway]?.levels || pathway.primaryPathway
    : pathway.primaryPathway;

  const milestones: Milestone[] = [];
  const baseYear = new Date().getFullYear();

  levels.forEach((level, levelIndex) => {
    const levelStartYear = level.startYear || baseYear + levelIndex * 2;
    const levelStartSemester = level.startSemester || "FALL";
    
    // Add all milestones for this level FIRST (before header)
    const levelMilestones = pathwayLevelToMilestones(level, baseYear, levelIndex);
    
    // If there are milestones, add a level header at the start
    if (levelMilestones.length > 0) {
      // Find the earliest milestone date for the header
      const earliestMilestone = levelMilestones.reduce((earliest, current) => {
        if (!earliest) return current;
        const earliestDate = new Date(earliest.targetDate || earliest.year + "-01-01");
        const currentDate = new Date(current.targetDate || current.year + "-01-01");
        return currentDate < earliestDate ? current : earliest;
      });
      
      milestones.push({
        id: `level-header-${level.level}-${level.institution}-${levelIndex}`,
        title: `${level.level} @ ${level.institution}`,
        kind: "COURSE",
        semester: earliestMilestone.semester || levelStartSemester,
        year: earliestMilestone.year || levelStartYear,
        targetDate: earliestMilestone.targetDate || semesterToDate(levelStartSemester, levelStartYear),
        status: "PLANNED" as MilestoneStatus,
        description: level.description || `${level.programName}${level.duration ? ` (${level.duration})` : ""}`,
        category: "DEGREE",
      });
    }
    
    milestones.push(...levelMilestones);
  });

  return milestones;
}

/**
 * Get institution display name
 */
export function getInstitutionName(institution: string): string {
  const names: Record<string, string> = {
    MDC: "Miami Dade College",
    FIU: "Florida International University",
    UF: "University of Florida",
    FSU: "Florida State University",
    OTHER: "Other Institution",
  };
  return names[institution] || institution;
}

/**
 * Get degree level display name
 */
export function getDegreeLevelName(level: string): string {
  const names: Record<string, string> = {
    AA: "Associate of Arts",
    AS: "Associate of Science",
    BS: "Bachelor of Science",
    BA: "Bachelor of Arts",
    MS: "Master of Science",
    MA: "Master of Arts",
    PhD: "Doctor of Philosophy",
    CERT: "Certificate",
  };
  return names[level] || level;
}

