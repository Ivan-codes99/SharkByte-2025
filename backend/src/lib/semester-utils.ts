/**
 * Semester utility functions for backend
 */

export type Semester = "FALL" | "SPRING" | "SUMMER";

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

