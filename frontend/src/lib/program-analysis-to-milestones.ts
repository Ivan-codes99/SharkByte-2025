/**
 * Convert ProgramAnalysisResponse to Milestone array for Timeline
 */

import type { ProgramAnalysisResponse, RequirementGroup, ProgramCourse } from "../types";
import type { Milestone, MilestoneStatus, Semester } from "../types";
import { semesterToDate } from "./semester";
import { logger } from "./logger";

interface CourseWithContext {
  course: ProgramCourse;
  groupName: string;
  isElective: boolean;
  requiredCredits?: number;
  electiveGroupId?: string;
  requiredCount?: number; // Number of courses required from this elective group
}

/**
 * Recursively extract all courses from nested requirement groups
 */
function extractCourses(
  groups: RequirementGroup[],
  parentName: string = "",
  isElective: boolean = false,
  electiveGroupId?: string
): CourseWithContext[] {
  const courses: CourseWithContext[] = [];

  groups.forEach((group) => {
    const fullGroupName = parentName ? `${parentName} > ${group.name}` : group.name;
    const isElectiveGroup = 
      group.name.toLowerCase().includes("elective") ||
      group.name.toLowerCase().includes("select") ||
      group.name.toLowerCase().includes("choose");

    // If this group has courses, add them
    if (group.courses && group.courses.length > 0) {
      // Calculate how many courses are needed based on requiredCredits
      // Assume average 3 credits per course
      const avgCreditsPerCourse = 3;
      const requiredCount = isElectiveGroup && group.requiredCredits
        ? Math.ceil(group.requiredCredits / avgCreditsPerCourse)
        : undefined;

      group.courses.forEach((course) => {
        // Skip pattern courses (like "CAI*", "CAP*") - we'll handle them differently
        if (course.code.endsWith("*")) {
          return;
        }

        courses.push({
          course,
          groupName: fullGroupName,
          isElective: isElective || isElectiveGroup,
          requiredCredits: group.requiredCredits,
          electiveGroupId: isElectiveGroup ? `elective-${fullGroupName}` : electiveGroupId,
          requiredCount,
        });
      });
    }

    // If this group has nested groups, recurse
    if (group.groups && group.groups.length > 0) {
      const nestedCourses = extractCourses(
        group.groups,
        fullGroupName,
        isElective || isElectiveGroup,
        isElectiveGroup ? `elective-${fullGroupName}` : electiveGroupId
      );
      courses.push(...nestedCourses);
    }
  });

  return courses;
}

/**
 * Distribute courses across semesters based on prerequisites and credits
 * Uses topological sorting to ensure prerequisites are scheduled first
 */
function distributeCoursesAcrossSemesters(
  courses: CourseWithContext[],
  startYear: number = new Date().getFullYear(),
  startSemester: Semester = "FALL"
): Map<string, CourseWithContext[]> {
  const coursesBySemester = new Map<string, CourseWithContext[]>();
  const courseCodeToSemester = new Map<string, string>(); // Track when each course is scheduled
  const semesterOrder: Semester[] = ["FALL", "SPRING", "SUMMER"];
  const startIndex = semesterOrder.indexOf(startSemester);
  const maxCreditsPerSemester = 15; // Typical full-time load

  // Create a map of course codes to courses for quick lookup
  const courseMap = new Map<string, CourseWithContext>();
  courses.forEach(c => courseMap.set(c.course.code, c));

  // Topological sort: courses without prerequisites first, then courses whose prerequisites are scheduled
  const scheduled = new Set<string>();
  const remaining = new Set(courses.map(c => c.course.code));
  
  let currentYear = startYear;
  let currentSemesterIndex = startIndex;
  let creditsThisSemester = 0;

  // Helper to get the next semester
  const getNextSemester = () => {
    const semester = semesterOrder[currentSemesterIndex];
    const key = `${currentYear}-${semester}`;
    
    // Move to next semester
    currentSemesterIndex = (currentSemesterIndex + 1) % 3;
    if (currentSemesterIndex === 0) {
      currentYear++;
    }
    
    return { semester, key };
  };

  // Helper to get current semester key
  const getCurrentSemesterKey = () => {
    const semester = semesterOrder[currentSemesterIndex];
    return `${currentYear}-${semester}`;
  };

  // Helper to check if prerequisites are scheduled
  const arePrerequisitesScheduled = (course: ProgramCourse): boolean => {
    if (!course.prerequisites || course.prerequisites.length === 0) {
      return true;
    }
    return course.prerequisites.every(prereq => scheduled.has(prereq));
  };

  // Helper to find the latest semester where prerequisites are scheduled
  const getLatestPrerequisiteSemester = (course: ProgramCourse): string | null => {
    if (!course.prerequisites || course.prerequisites.length === 0) {
      return null;
    }
    
    let latestSemester: string | null = null;
    for (const prereq of course.prerequisites) {
      const prereqSemester = courseCodeToSemester.get(prereq);
      if (!prereqSemester) {
        return null; // Prerequisite not scheduled yet
      }
      if (!latestSemester || prereqSemester > latestSemester) {
        latestSemester = prereqSemester;
      }
    }
    return latestSemester;
  };

  // Process courses in rounds until all are scheduled
  let iterations = 0;
  const maxIterations = courses.length * 2; // Safety limit
  const maxYearsFromStart = 8; // Maximum years the timeline should span
  const maxYear = startYear + maxYearsFromStart;

  while (remaining.size > 0 && iterations < maxIterations) {
    iterations++;
    let scheduledThisRound = false;

    // Find courses that can be scheduled (prerequisites are met)
    const readyCourses: CourseWithContext[] = [];
    
    for (const courseCode of remaining) {
      const courseWithContext = courseMap.get(courseCode);
      if (!courseWithContext) continue;

      // Use explicit semester/year if provided
      if (courseWithContext.course.semester && courseWithContext.course.year) {
        const key = `${courseWithContext.course.year}-${courseWithContext.course.semester}`;
        if (!coursesBySemester.has(key)) {
          coursesBySemester.set(key, []);
        }
        coursesBySemester.get(key)!.push(courseWithContext);
        courseCodeToSemester.set(courseCode, key);
        scheduled.add(courseCode);
        remaining.delete(courseCode);
        scheduledThisRound = true;
        continue;
      }

      // Check if prerequisites are scheduled
      if (arePrerequisitesScheduled(courseWithContext.course)) {
        readyCourses.push(courseWithContext);
      }
    }

    // Sort ready courses: those with prerequisites scheduled later come after their prerequisites
    readyCourses.sort((a, b) => {
      const aLatestPrereq = getLatestPrerequisiteSemester(a.course);
      const bLatestPrereq = getLatestPrerequisiteSemester(b.course);
      
      if (aLatestPrereq && bLatestPrereq) {
        return aLatestPrereq.localeCompare(bLatestPrereq);
      }
      if (aLatestPrereq) return 1; // a has prerequisites, b doesn't
      if (bLatestPrereq) return -1; // b has prerequisites, a doesn't
      return 0; // Both have no prerequisites
    });

    // Schedule ready courses
    for (const courseWithContext of readyCourses) {
      const { course } = courseWithContext;
      const credits = course.credits || 3;

      // If course has prerequisites, schedule it at least one semester after the latest prerequisite
      const latestPrereqSemester = getLatestPrerequisiteSemester(course);
      if (latestPrereqSemester) {
        // Parse the prerequisite semester to determine when to schedule this course
        const [prereqYearStr, prereqSemester] = latestPrereqSemester.split("-");
        const prereqYear = parseInt(prereqYearStr, 10);
        const prereqIndex = semesterOrder.indexOf(prereqSemester as Semester);
        
        // Schedule at least one semester after the prerequisite
        let targetYear = prereqYear;
        let targetSemesterIndex = (prereqIndex + 1) % 3;
        if (targetSemesterIndex === 0) {
          targetYear++;
        }

        // Make sure we're not scheduling in the past or too far in the future
        if (targetYear < currentYear || (targetYear === currentYear && targetSemesterIndex < currentSemesterIndex)) {
          // Use current semester instead
          targetYear = currentYear;
          targetSemesterIndex = currentSemesterIndex;
        } else if (targetYear > maxYear) {
          // Cap at maximum year to prevent timeline from going too far
          targetYear = maxYear;
          targetSemesterIndex = 2; // SUMMER (last semester of the year)
        } else {
          // Update current position to the target
          currentYear = targetYear;
          currentSemesterIndex = targetSemesterIndex;
          creditsThisSemester = 0;
        }
      }

      // Check if current semester has room
      const currentKey = getCurrentSemesterKey();
      const currentSemesterCredits = coursesBySemester.get(currentKey)?.reduce(
        (sum, c) => sum + (c.course.credits || 3), 0
      ) || 0;

      if (currentSemesterCredits + credits > maxCreditsPerSemester) {
        // Move to next semester
        getNextSemester();
        creditsThisSemester = 0;
        
        // Safety check: if we've exceeded max year, stop scheduling
        if (currentYear > maxYear) {
          logger.warn("Reached maximum timeline duration during course distribution", {
            maxYear,
            currentYear,
            remainingCourses: remaining.size,
          }, "ProgramAnalysisConverter");
          break;
        }
      }

      const key = getCurrentSemesterKey();
      if (!coursesBySemester.has(key)) {
        coursesBySemester.set(key, []);
      }

      coursesBySemester.get(key)!.push(courseWithContext);
      courseCodeToSemester.set(course.code, key);
      scheduled.add(course.code);
      remaining.delete(course.code);
      creditsThisSemester += credits;
      scheduledThisRound = true;

      // Move to next semester if we've filled this one
      if (creditsThisSemester >= maxCreditsPerSemester) {
        getNextSemester();
        creditsThisSemester = 0;
      }
    }

    // If we didn't schedule anything this round, we might have a circular dependency
    // or missing prerequisites. Schedule remaining courses anyway to avoid infinite loop.
    if (!scheduledThisRound && remaining.size > 0) {
      // Schedule remaining courses in current/next semesters
      for (const courseCode of Array.from(remaining)) {
        const courseWithContext = courseMap.get(courseCode);
        if (!courseWithContext) continue;

        const credits = courseWithContext.course.credits || 3;
        const currentKey = getCurrentSemesterKey();
        const currentSemesterCredits = coursesBySemester.get(currentKey)?.reduce(
          (sum, c) => sum + (c.course.credits || 3), 0
        ) || 0;

        if (currentSemesterCredits + credits > maxCreditsPerSemester) {
          getNextSemester();
          creditsThisSemester = 0;
        }

        const key = getCurrentSemesterKey();
        if (!coursesBySemester.has(key)) {
          coursesBySemester.set(key, []);
        }

        coursesBySemester.get(key)!.push(courseWithContext);
        courseCodeToSemester.set(courseCode, key);
        scheduled.add(courseCode);
        remaining.delete(courseCode);
        creditsThisSemester += credits;

        if (creditsThisSemester >= maxCreditsPerSemester) {
          getNextSemester();
          creditsThisSemester = 0;
        }
      }
    }
  }

  return coursesBySemester;
}

/**
 * Convert a course to a milestone
 */
function courseToMilestone(
  courseWithContext: CourseWithContext,
  year: number,
  semester: Semester,
  status: MilestoneStatus = "PLANNED"
): Milestone {
  const { course, groupName, isElective, electiveGroupId } = courseWithContext;
  
  const title = course.title 
    ? `${course.code}: ${course.title}`
    : course.code;

  return {
    id: `course-${course.code}-${year}-${semester}`,
    title,
    kind: "COURSE",
    semester,
    year,
    targetDate: semesterToDate(semester, year),
    status,
    description: course.description || `Part of ${groupName}`,
    credits: course.credits,
    category: isElective ? "ELECTIVE" : "CORE",
    isElective,
    electiveGroupId,
  };
}

/**
 * Convert program analysis to milestones
 */
export function programAnalysisToMilestones(
  analysis: ProgramAnalysisResponse,
  startYear: number = new Date().getFullYear(),
  startSemester: Semester = "FALL"
): Milestone[] {
  const milestones: Milestone[] = [];

  // Extract all courses from requirement groups
  const courses = extractCourses(analysis.requirements.groups);
  
  // Create a map of course code to course context for quick lookup
  const courseContextMap = new Map<string, CourseWithContext>();
  courses.forEach(courseWithContext => {
    courseContextMap.set(courseWithContext.course.code, courseWithContext);
  });
  
  logger.info("Extracting courses from program analysis", {
    totalCourses: courses.length,
    programName: analysis.programName,
  }, "ProgramAnalysisConverter");

  // Distribute courses across semesters
  const coursesBySemester = distributeCoursesAcrossSemesters(
    courses,
    startYear,
    startSemester
  );

  // Convert courses to milestones
  coursesBySemester.forEach((semesterCourses, key) => {
    const [yearStr, semester] = key.split("-");
    const year = parseInt(yearStr, 10);
    
    semesterCourses.forEach((courseWithContext) => {
      const milestone = courseToMilestone(
        courseWithContext,
        year,
        semester as Semester
      );
      milestones.push(milestone);
    });
  });

  // Group electives by electiveGroupId
  const electiveGroups = new Map<string, Milestone[]>();

  milestones.forEach((milestone) => {
    if (milestone.electiveGroupId) {
      if (!electiveGroups.has(milestone.electiveGroupId)) {
        electiveGroups.set(milestone.electiveGroupId, []);
      }
      electiveGroups.get(milestone.electiveGroupId)!.push(milestone);
    }
  });

  // Update elective milestones with requiredCount and totalOptions
  electiveGroups.forEach((groupMilestones) => {
    // Get required count from the first milestone's context (if available)
    const firstMilestone = groupMilestones[0];
    // Extract course code from title (format: "CODE: Title" or just "CODE")
    const courseCode = firstMilestone.title.split(":")[0].trim();
    const courseWithContext = courseContextMap.get(courseCode);
    
    // Use requiredCount from context, or default to 1
    const requiredCount = courseWithContext?.requiredCount || 1;
    
    groupMilestones.forEach((milestone) => {
      milestone.requiredCount = requiredCount;
      milestone.totalOptions = groupMilestones.length;
    });
  });

  // Add certifications
  if (analysis.certifications) {
    analysis.certifications.required?.forEach((cert, index) => {
      milestones.push({
        id: `cert-required-${index}`,
        title: cert.name,
        kind: "CERT",
        status: "PLANNED",
        description: cert.description,
        category: "CORE",
      });
    });

    analysis.certifications.recommended?.forEach((cert, index) => {
      milestones.push({
        id: `cert-recommended-${index}`,
        title: cert.name,
        kind: "CERT",
        status: "PLANNED",
        description: cert.description,
        category: "ELECTIVE",
      });
    });
  }

  // Add exams
  if (analysis.exams) {
    analysis.exams.forEach((exam, index) => {
      milestones.push({
        id: `exam-${index}`,
        title: exam.name,
        kind: "CERT", // Using CERT icon for exams
        status: "PLANNED",
        description: exam.description,
        category: exam.required ? "CORE" : "ELECTIVE",
      });
    });
  }

  // Add internships
  if (analysis.internships) {
    analysis.internships.forEach((internship, index) => {
      // Try to parse timing to get semester/year
      let semester: Semester | undefined;
      let year: number | undefined;
      
      // Simple parsing - could be improved
      const timingLower = internship.timing.toLowerCase();
      if (timingLower.includes("summer")) {
        semester = "SUMMER";
      } else if (timingLower.includes("spring")) {
        semester = "SPRING";
      } else if (timingLower.includes("fall")) {
        semester = "FALL";
      }

      milestones.push({
        id: `internship-${index}`,
        title: internship.description || "Internship",
        kind: "INTERNSHIP",
        semester,
        year: year || startYear + 2, // Default to 2 years from start
        targetDate: semester ? semesterToDate(semester, year || startYear + 2) : undefined,
        status: "PLANNED",
        description: internship.description,
        category: internship.type === "REQUIRED" ? "CORE" : "ELECTIVE",
      });
    });
  }

  // Add degree completion milestone at the end
  const lastSemester = Array.from(coursesBySemester.keys())
    .sort()
    .pop();
  
  let degreeYear = startYear + 4; // Default to 4 years
  let degreeSemester: Semester = "SPRING";
  
  if (lastSemester) {
    const [yearStr, semester] = lastSemester.split("-");
    const lastYear = parseInt(yearStr, 10);
    degreeYear = lastYear;
    degreeSemester = semester as Semester;
    
    // Cap the degree year to a reasonable maximum (e.g., 8 years from start)
    const maxYears = 8;
    if (degreeYear > startYear + maxYears) {
      logger.warn("Timeline exceeds maximum duration, capping at 8 years", {
        calculatedYear: degreeYear,
        startYear,
        cappedYear: startYear + maxYears,
      }, "ProgramAnalysisConverter");
      degreeYear = startYear + maxYears;
    }
  }

  milestones.push({
    id: "degree-completion",
    title: `${analysis.degreeType} in ${analysis.programName} @ ${analysis.institution}`,
    kind: "COURSE",
    semester: degreeSemester,
    year: degreeYear,
    targetDate: semesterToDate(degreeSemester, degreeYear),
    status: "PLANNED",
    description: analysis.metadata.description || `Complete ${analysis.degreeType} degree program`,
    category: "DEGREE",
  });

  // Sort milestones by targetDate
  milestones.sort((a, b) => {
    if (!a.targetDate) return 1;
    if (!b.targetDate) return -1;
    return a.targetDate.localeCompare(b.targetDate);
  });

  logger.info("Converted program analysis to milestones", {
    totalMilestones: milestones.length,
    courseMilestones: milestones.filter(m => m.kind === "COURSE").length,
    electiveGroups: electiveGroups.size,
  }, "ProgramAnalysisConverter");

  return milestones;
}

