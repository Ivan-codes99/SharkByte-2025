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
  groupId: string; // Unique identifier for the requirement group
}

interface GroupRequirement {
  groupId: string;
  groupName: string;
  requiredCredits: number;
  isElective: boolean;
  courses: CourseWithContext[];
  creditsScheduled: number; // Track how many credits we've scheduled from this group
  isSatisfied: boolean; // Whether we've met the required credits
}

/**
 * Recursively extract all courses from nested requirement groups
 * and build a structure to track group requirements
 */
function extractCoursesAndGroups(
  groups: RequirementGroup[],
  parentName: string = "",
  isElective: boolean = false,
  electiveGroupId?: string,
  groupRequirements: Map<string, GroupRequirement> = new Map(),
  groupIdPrefix: string = ""
): { courses: CourseWithContext[]; groupRequirements: Map<string, GroupRequirement> } {
  const courses: CourseWithContext[] = [];

  groups.forEach((group, groupIndex) => {
    const fullGroupName = parentName ? `${parentName} > ${group.name}` : group.name;
    const isElectiveGroup = 
      group.name.toLowerCase().includes("elective") ||
      group.name.toLowerCase().includes("select") ||
      group.name.toLowerCase().includes("choose");
    
    const currentGroupId = groupIdPrefix ? `${groupIdPrefix}-${groupIndex}` : `group-${groupIndex}`;
    const currentElectiveGroupId = isElectiveGroup ? `elective-${fullGroupName}` : electiveGroupId;

    // If this group has courses, add them
    if (group.courses && group.courses.length > 0) {
      const groupCourses: CourseWithContext[] = [];
      
      group.courses.forEach((course) => {
        // Skip pattern courses (like "CAI*", "CAP*") - we'll handle them differently
        if (course.code.endsWith("*")) {
          return;
        }

        const courseWithContext: CourseWithContext = {
          course,
          groupName: fullGroupName,
          isElective: isElective || isElectiveGroup,
          requiredCredits: group.requiredCredits,
          electiveGroupId: currentElectiveGroupId,
          groupId: currentGroupId,
        };
        
        groupCourses.push(courseWithContext);
        courses.push(courseWithContext);
      });

      // Track this group's requirements
      if (group.requiredCredits > 0) {
        groupRequirements.set(currentGroupId, {
          groupId: currentGroupId,
          groupName: fullGroupName,
          requiredCredits: group.requiredCredits,
          isElective: isElective || isElectiveGroup,
          courses: groupCourses,
          creditsScheduled: 0,
          isSatisfied: false,
        });
      }
    }

    // If this group has nested groups, recurse
    if (group.groups && group.groups.length > 0) {
      const nestedResult = extractCoursesAndGroups(
        group.groups,
        fullGroupName,
        isElective || isElectiveGroup,
        currentElectiveGroupId,
        groupRequirements,
        currentGroupId
      );
      courses.push(...nestedResult.courses);
      // Merge group requirements
      nestedResult.groupRequirements.forEach((req, id) => {
        groupRequirements.set(id, req);
      });
    }
  });

  return { courses, groupRequirements };
}

/**
 * Distribute courses across semesters based on prerequisites and required credits
 * Only schedules enough courses to meet each group's required credits
 */
function distributeCoursesAcrossSemesters(
  courses: CourseWithContext[],
  groupRequirements: Map<string, GroupRequirement>,
  totalRequiredCredits: number,
  startYear: number = new Date().getFullYear(),
  startSemester: Semester = "FALL"
): Map<string, CourseWithContext[]> {
  const coursesBySemester = new Map<string, CourseWithContext[]>();
  const courseCodeToSemester = new Map<string, string>();
  const semesterOrder: Semester[] = ["FALL", "SPRING", "SUMMER"];
  const startIndex = semesterOrder.indexOf(startSemester);
  const maxCreditsPerSemester = 15;
  const maxYearsFromStart = 8;
  const maxYear = startYear + maxYearsFromStart;

  const courseMap = new Map<string, CourseWithContext>();
  courses.forEach(c => courseMap.set(c.course.code, c));

  const scheduled = new Set<string>();
  const remaining = new Set(courses.map(c => c.course.code));
  
  let currentYear = startYear;
  let currentSemesterIndex = startIndex;
  let creditsThisSemester = 0;
  let totalCreditsScheduled = 0;

  // Helper to get the next semester
  const getNextSemester = () => {
    const semester = semesterOrder[currentSemesterIndex];
    currentSemesterIndex = (currentSemesterIndex + 1) % 3;
    if (currentSemesterIndex === 0) {
      currentYear++;
    }
    return { semester, key: `${currentYear}-${semester}` };
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
        return null;
      }
      if (!latestSemester || prereqSemester > latestSemester) {
        latestSemester = prereqSemester;
      }
    }
    return latestSemester;
  };

  // Helper to check if a group's required credits are met
  const isGroupSatisfied = (groupId: string): boolean => {
    const groupReq = groupRequirements.get(groupId);
    if (!groupReq) return true; // If group not tracked, assume satisfied
    return groupReq.isSatisfied;
  };

  // Helper to check if we can schedule a course (group not satisfied, prerequisites met)
  const canScheduleCourse = (courseWithContext: CourseWithContext): boolean => {
    // Check if group is already satisfied
    if (isGroupSatisfied(courseWithContext.groupId)) {
      return false; // Group requirement already met
    }

    // Check prerequisites
    return arePrerequisitesScheduled(courseWithContext.course);
  };

  // Helper to schedule a course
  const scheduleCourse = (courseWithContext: CourseWithContext): boolean => {
    const { course } = courseWithContext;
    const credits = course.credits || 3;
    const groupReq = groupRequirements.get(courseWithContext.groupId);

    // Check if scheduling this course would exceed the group's required credits
    if (groupReq && !groupReq.isSatisfied) {
      const creditsAfter = groupReq.creditsScheduled + credits;
      if (creditsAfter > groupReq.requiredCredits) {
        // This would exceed required credits, don't schedule
        return false;
      }
    }

    // Check if prerequisites require a later semester
    const latestPrereqSemester = getLatestPrerequisiteSemester(course);
    if (latestPrereqSemester) {
      const [prereqYearStr, prereqSemester] = latestPrereqSemester.split("-");
      const prereqYear = parseInt(prereqYearStr, 10);
      const prereqIndex = semesterOrder.indexOf(prereqSemester as Semester);
      
      let targetYear = prereqYear;
      let targetSemesterIndex = (prereqIndex + 1) % 3;
      if (targetSemesterIndex === 0) {
        targetYear++;
      }

      if (targetYear < currentYear || (targetYear === currentYear && targetSemesterIndex < currentSemesterIndex)) {
        targetYear = currentYear;
        targetSemesterIndex = currentSemesterIndex;
      } else if (targetYear > maxYear) {
        targetYear = maxYear;
        targetSemesterIndex = 2;
      } else {
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
      getNextSemester();
      creditsThisSemester = 0;
      
      if (currentYear > maxYear) {
        return false;
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
    totalCreditsScheduled += credits;

    // Update group requirement tracking
    if (groupReq) {
      groupReq.creditsScheduled += credits;
      if (groupReq.creditsScheduled >= groupReq.requiredCredits) {
        groupReq.isSatisfied = true;
      }
    }

    if (creditsThisSemester >= maxCreditsPerSemester) {
      getNextSemester();
      creditsThisSemester = 0;
    }

    return true;
  };

  // Process courses in rounds until all groups are satisfied or we run out of courses
  let iterations = 0;
  const maxIterations = courses.length * 3;

  while (totalCreditsScheduled < totalRequiredCredits && remaining.size > 0 && iterations < maxIterations) {
    iterations++;
    let scheduledThisRound = false;

    // Find courses that can be scheduled
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
        
        const credits = courseWithContext.course.credits || 3;
        totalCreditsScheduled += credits;
        
        const groupReq = groupRequirements.get(courseWithContext.groupId);
        if (groupReq) {
          groupReq.creditsScheduled += credits;
          if (groupReq.creditsScheduled >= groupReq.requiredCredits) {
            groupReq.isSatisfied = true;
          }
        }
        
        scheduledThisRound = true;
        continue;
      }

      if (canScheduleCourse(courseWithContext)) {
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
      if (aLatestPrereq) return 1;
      if (bLatestPrereq) return -1;
      return 0;
    });

    // Schedule ready courses
    for (const courseWithContext of readyCourses) {
      if (totalCreditsScheduled >= totalRequiredCredits) {
        break; // All required credits met
      }

      if (scheduleCourse(courseWithContext)) {
        scheduledThisRound = true;
      }
    }

    // If we didn't schedule anything and there are remaining courses, try to schedule them anyway
    // (might be missing prerequisites or other issues)
    if (!scheduledThisRound && remaining.size > 0 && totalCreditsScheduled < totalRequiredCredits) {
      for (const courseCode of Array.from(remaining)) {
        if (totalCreditsScheduled >= totalRequiredCredits) break;
        
        const courseWithContext = courseMap.get(courseCode);
        if (!courseWithContext) continue;

        if (scheduleCourse(courseWithContext)) {
          scheduledThisRound = true;
        }
      }
    }

    // If we've met all required credits, stop
    if (totalCreditsScheduled >= totalRequiredCredits) {
      logger.info("All required credits scheduled", {
        totalRequiredCredits,
        totalCreditsScheduled,
        remainingCourses: remaining.size,
      }, "ProgramAnalysisConverter");
      break;
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
    countsTowardRequired: true, // Default to true, will be set to false for optional elective options
    category: isElective ? "ELECTIVE" : "CORE",
    isElective,
    electiveGroupId,
  };
}

/**
 * Calculate total required credits from all groups
 * For nested groups: if parent has requiredCredits, use that (children are subsets)
 * Otherwise, sum children's requiredCredits
 */
function calculateTotalRequiredCredits(groups: RequirementGroup[]): number {
  let total = 0;
  
  groups.forEach(group => {
    if (group.groups && group.groups.length > 0) {
      // Has nested groups
      if (group.requiredCredits && group.requiredCredits > 0) {
        // Parent has requiredCredits - use that (children are subsets that add up to parent)
        total += group.requiredCredits;
      } else {
        // Parent doesn't have requiredCredits, sum children
        total += calculateTotalRequiredCredits(group.groups);
      }
    } else {
      // Leaf group (no nested groups)
      total += group.requiredCredits || 0;
    }
  });
  
  return total;
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

  // Extract courses and build group requirements tracking
  const { courses, groupRequirements } = extractCoursesAndGroups(analysis.requirements.groups);
  
  // Calculate total required credits
  const totalRequiredCredits = analysis.metadata.totalCredits || calculateTotalRequiredCredits(analysis.requirements.groups);
  
  logger.info("Extracting courses from program analysis", {
    totalCourses: courses.length,
    totalGroups: groupRequirements.size,
    totalRequiredCredits,
    programName: analysis.programName,
  }, "ProgramAnalysisConverter");

  // Create a map of course code to course context for quick lookup
  const courseContextMap = new Map<string, CourseWithContext>();
  courses.forEach(courseWithContext => {
    courseContextMap.set(courseWithContext.course.code, courseWithContext);
  });

  // Distribute courses across semesters (only scheduling enough to meet requirements)
  const coursesBySemester = distributeCoursesAcrossSemesters(
    courses,
    groupRequirements,
    totalRequiredCredits,
    startYear,
    startSemester
  );

  // Convert scheduled courses to milestones
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

  // Add all elective courses as milestones (even if not scheduled) so they're visible
  // Group them by electiveGroupId
  const electiveGroups = new Map<string, CourseWithContext[]>();
  const scheduledCourseCodes = new Set(milestones.map(m => {
    // Extract course code from title (format: "CODE: Title" or just "CODE")
    return m.title.split(":")[0].trim();
  }));

  courses.forEach(courseWithContext => {
    if (courseWithContext.electiveGroupId) {
      if (!electiveGroups.has(courseWithContext.electiveGroupId)) {
        electiveGroups.set(courseWithContext.electiveGroupId, []);
      }
      electiveGroups.get(courseWithContext.electiveGroupId)!.push(courseWithContext);
    }
  });

  // For each elective group, add unscheduled courses as milestones
  // They'll be shown in the elective group but not counted toward required credits
  electiveGroups.forEach((groupCourses, groupId) => {
    const groupReq = Array.from(groupRequirements.values()).find(
      req => req.courses.some(c => c.electiveGroupId === groupId)
    );
    
    const requiredCredits = groupReq?.requiredCredits || 0;
    const requiredCount = requiredCredits > 0 ? Math.ceil(requiredCredits / 3) : 1; // Assume 3 credits per course
    
    // Find which courses are already scheduled
    const scheduledCourses = groupCourses.filter(c => 
      scheduledCourseCodes.has(c.course.code)
    );
    
    // Add unscheduled courses to the timeline (they'll be in elective groups)
    // Add them to the same semesters as scheduled courses from the group, or distribute them
    const unscheduledCourses = groupCourses.filter(c => 
      !scheduledCourseCodes.has(c.course.code)
    );
    
    if (unscheduledCourses.length > 0) {
      // Find semesters where courses from this group were scheduled
      const groupSemesters = new Set<string>();
      scheduledCourses.forEach(c => {
        const semester = Array.from(coursesBySemester.entries()).find(
          ([_, courses]) => courses.some(c2 => c2.course.code === c.course.code)
        )?.[0];
        if (semester) {
          groupSemesters.add(semester);
        }
      });
      
      // If no scheduled courses, add to a default semester
      if (groupSemesters.size === 0) {
        const defaultKey = `${startYear}-${startSemester}`;
        groupSemesters.add(defaultKey);
      }
      
      // Distribute unscheduled courses across the same semesters
      const semesterArray = Array.from(groupSemesters).sort();
      unscheduledCourses.forEach((courseWithContext, index) => {
        const targetSemester = semesterArray[index % semesterArray.length];
        const [yearStr, semester] = targetSemester.split("-");
        const year = parseInt(yearStr, 10);
        
        const milestone = courseToMilestone(
          courseWithContext,
          year,
          semester as Semester
        );
        milestone.status = "PLANNED";
        milestone.countsTowardRequired = false; // These are optional elective options, not required
        milestones.push(milestone);
      });
    }
    
    // Update elective milestones with requiredCount and totalOptions
    const allGroupMilestones = milestones.filter(m => 
      m.electiveGroupId === groupId
    );
    
    allGroupMilestones.forEach((milestone) => {
      milestone.requiredCount = requiredCount;
      milestone.totalOptions = groupCourses.length;
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
        kind: "CERT",
        status: "PLANNED",
        description: exam.description,
        category: exam.required ? "CORE" : "ELECTIVE",
      });
    });
  }

  // Add internships
  if (analysis.internships) {
    analysis.internships.forEach((internship, index) => {
      let semester: Semester | undefined;
      let year: number | undefined;
      
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
        year: year || startYear + 2,
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
  
  let degreeYear = startYear + 4;
  let degreeSemester: Semester = "SPRING";
  
  if (lastSemester) {
    const [yearStr, semester] = lastSemester.split("-");
    const lastYear = parseInt(yearStr, 10);
    degreeYear = lastYear;
    degreeSemester = semester as Semester;
    
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
    totalRequiredCredits,
    scheduledCredits: Array.from(coursesBySemester.values()).reduce((sum, courses) => {
      return sum + courses.reduce((s, c) => s + (c.course.credits || 0), 0);
    }, 0),
  }, "ProgramAnalysisConverter");

  return milestones;
}
