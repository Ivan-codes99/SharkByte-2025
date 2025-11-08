export type Semester = "FALL" | "SPRING" | "SUMMER";

export interface SemesterInfo {
  semester: Semester;
  year: number;
}

/**
 * Converts a semester and year to a target date
 * Fall -> December of that year
 * Spring -> May of that year
 * Summer -> August of that year
 */
export function semesterToDate(semester: Semester, year: number): string {
  let month: number;
  let day = 15; // Mid-month date

  switch (semester) {
    case "FALL":
      month = 11; // December (0-indexed, so 11 = December)
      break;
    case "SPRING":
      month = 4; // May (0-indexed, so 4 = May)
      break;
    case "SUMMER":
      month = 7; // August (0-indexed, so 7 = August)
      break;
  }

  const date = new Date(year, month, day);
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD
}

/**
 * Formats a semester and year as a display string
 * e.g., "Fall 2025", "Spring 2026"
 */
export function formatSemester(semester: Semester, year: number): string {
  const semesterNames = {
    FALL: "Fall",
    SPRING: "Spring",
    SUMMER: "Summer",
  };
  return `${semesterNames[semester]} ${year}`;
}

/**
 * Extracts semester and year from a date string
 * Returns null if date doesn't match a semester pattern
 */
export function dateToSemester(dateString: string): SemesterInfo | null {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();

  // December (11) = Fall
  if (month === 11) {
    return { semester: "FALL", year };
  }
  // May (4) = Spring
  if (month === 4) {
    return { semester: "SPRING", year };
  }
  // August (7) = Summer
  if (month === 7) {
    return { semester: "SUMMER", year };
  }

  return null;
}

/**
 * Groups milestones by semester
 */
export function groupBySemester<T extends { targetDate?: string }>(
  items: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  items.forEach((item) => {
    if (!item.targetDate) return;

    const semesterInfo = dateToSemester(item.targetDate);
    if (!semesterInfo) return;

    const key = `${semesterInfo.semester}-${semesterInfo.year}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  });

  return groups;
}

/**
 * Sorts semester keys chronologically
 */
export function sortSemesterKeys(keys: string[]): string[] {
  return keys.sort((a, b) => {
    const [semA, yearA] = a.split("-");
    const [semB, yearB] = b.split("-");

    const yearNumA = parseInt(yearA);
    const yearNumB = parseInt(yearB);

    if (yearNumA !== yearNumB) {
      return yearNumA - yearNumB;
    }

    // Same year, sort by semester order: Spring, Summer, Fall
    const order = { SPRING: 0, SUMMER: 1, FALL: 2 };
    return order[semA as keyof typeof order] - order[semB as keyof typeof order];
  });
}

/**
 * Extracts month and year from a date string
 */
export function dateToMonth(dateString: string): { month: number; year: number } | null {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  
  return {
    month: date.getMonth(), // 0-indexed
    year: date.getFullYear(),
  };
}

/**
 * Formats a month and year as a display string
 * e.g., "March 2025", "October 2025"
 */
export function formatMonth(month: number, year: number): string {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${monthNames[month]} ${year}`;
}

/**
 * Checks if a month is a semester month
 * May (4) = Spring, August (7) = Summer, December (11) = Fall
 */
export function isSemesterMonth(month: number): boolean {
  return month === 4 || month === 7 || month === 11;
}

/**
 * Groups milestones by time period (semester or month)
 * Returns a hierarchical structure with both semesters and months
 */
export interface TimeGroup<T = any> {
  type: "semester" | "month";
  key: string;
  displayName: string;
  milestones: T[];
  date: Date;
  parentSemester?: string; // Key of parent semester if this is a nested month
}

/**
 * Determines which semester a month belongs to
 * Spring: Jan (0) - Apr (3), May (4) is semester end
 * Summer: Jun (5) - Jul (6), Aug (7) is semester end
 * Fall: Sep (8) - Nov (10), Dec (11) is semester end
 */
export function getSemesterForMonth(month: number, year: number): SemesterInfo | null {
  if (month >= 0 && month <= 4) {
    // January through May = Spring
    return { semester: "SPRING", year };
  } else if (month >= 5 && month <= 7) {
    // June through August = Summer
    return { semester: "SUMMER", year };
  } else if (month >= 8 && month <= 11) {
    // September through December = Fall
    return { semester: "FALL", year };
  }
  return null;
}

export function groupMilestonesByTime<T extends { targetDate?: string }>(
  items: T[]
): TimeGroup<T>[] {
  const groups = new Map<string, TimeGroup<T>>();

  items.forEach((item) => {
    if (!item.targetDate) return;

    const date = new Date(item.targetDate);
    if (isNaN(date.getTime())) return;

    const month = date.getMonth();
    const year = date.getFullYear();

    // Check if it's a semester end month (May, August, December)
    const semesterInfo = dateToSemester(item.targetDate);
    
    if (semesterInfo) {
      // Group by semester (semester end month)
      const key = `semester-${semesterInfo.semester}-${semesterInfo.year}`;
      if (!groups.has(key)) {
        groups.set(key, {
          type: "semester",
          key,
          displayName: formatSemester(semesterInfo.semester, semesterInfo.year),
          milestones: [],
          date: new Date(year, month === 11 ? 11 : month === 4 ? 4 : 7, 15),
        });
      }
      groups.get(key)!.milestones.push(item);
    } else {
      // Group by month - check if it belongs to a semester
      const parentSemester = getSemesterForMonth(month, year);
      const key = `month-${year}-${month}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          type: "month",
          key,
          displayName: formatMonth(month, year),
          milestones: [],
          date: new Date(year, month, 15),
          parentSemester: parentSemester
            ? `semester-${parentSemester.semester}-${parentSemester.year}`
            : undefined,
        });
      }
      groups.get(key)!.milestones.push(item);
    }
  });

  // Build hierarchical structure: semesters first, then their nested months
  const sortedGroups: TimeGroup<T>[] = [];
  const semesterGroups = Array.from(groups.values())
    .filter((g) => g.type === "semester")
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  semesterGroups.forEach((semester) => {
    // Add the semester
    sortedGroups.push(semester);

    // Find and add all months that belong to this semester
    const nestedMonths = Array.from(groups.values())
      .filter((g) => g.type === "month" && g.parentSemester === semester.key)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    sortedGroups.push(...nestedMonths);
  });

  // Add any standalone months (months without a parent semester)
  const standaloneMonths = Array.from(groups.values())
    .filter((g) => g.type === "month" && !g.parentSemester)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  sortedGroups.push(...standaloneMonths);

  return sortedGroups;
}