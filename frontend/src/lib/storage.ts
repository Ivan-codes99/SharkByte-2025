/**
 * Local Storage Utilities
 * Handles saving and retrieving application data from browser localStorage
 */

import type { ProgramAnalysisResponse, RequirementGroup } from "../types";
import { logger } from "./logger";

const STORAGE_KEYS = {
  PROGRAM_ANALYSIS: "sharkscholar_program_analysis",
} as const;

/**
 * Save program analysis to localStorage
 */
export function saveProgramAnalysis(analysis: ProgramAnalysisResponse): void {
  try {
    const serialized = JSON.stringify(analysis);
    localStorage.setItem(STORAGE_KEYS.PROGRAM_ANALYSIS, serialized);
    // Helper function to recursively count courses in nested groups
    const countCoursesInGroup = (group: RequirementGroup): number => {
      let count = group.courses?.length || 0;
      if (group.groups) {
        count += group.groups.reduce((sum, subGroup) => sum + countCoursesInGroup(subGroup), 0);
      }
      return count;
    };
    
    // Calculate total course count from all groups (including nested)
    const totalCourses = analysis.requirements.groups.reduce(
      (sum, group) => sum + countCoursesInGroup(group),
      0
    );
    
    logger.info("Program analysis saved to localStorage", {
      programName: analysis.programName,
      degreeType: analysis.degreeType,
      topLevelGroups: analysis.requirements.groups.length,
      totalCourses,
    }, "Storage");
  } catch (error) {
    logger.error("Failed to save program analysis to localStorage", error instanceof Error ? error : new Error(String(error)), "Storage");
    throw new Error("Failed to save program analysis");
  }
}

/**
 * Retrieve program analysis from localStorage
 */
export function getProgramAnalysis(): ProgramAnalysisResponse | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.PROGRAM_ANALYSIS);
    if (!serialized) {
      return null;
    }

    const analysis = JSON.parse(serialized) as ProgramAnalysisResponse;
    
    // Helper function to recursively count courses in nested groups
    const countCoursesInGroup = (group: RequirementGroup): number => {
      let count = group.courses?.length || 0;
      if (group.groups) {
        count += group.groups.reduce((sum, subGroup) => sum + countCoursesInGroup(subGroup), 0);
      }
      return count;
    };
    
    // Calculate total course count from all groups (including nested)
    const totalCourses = analysis.requirements.groups.reduce(
      (sum, group) => sum + countCoursesInGroup(group),
      0
    );
    
    logger.info("Program analysis retrieved from localStorage", {
      programName: analysis.programName,
      degreeType: analysis.degreeType,
      topLevelGroups: analysis.requirements.groups.length,
      totalCourses,
    }, "Storage");
    return analysis;
  } catch (error) {
    logger.error("Failed to retrieve program analysis from localStorage", error instanceof Error ? error : new Error(String(error)), "Storage");
    return null;
  }
}

/**
 * Clear program analysis from localStorage
 */
export function clearProgramAnalysis(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PROGRAM_ANALYSIS);
    logger.info("Program analysis cleared from localStorage", undefined, "Storage");
  } catch (error) {
    logger.error("Failed to clear program analysis from localStorage", error instanceof Error ? error : new Error(String(error)), "Storage");
  }
}

/**
 * Check if program analysis exists in localStorage
 */
export function hasProgramAnalysis(): boolean {
  return localStorage.getItem(STORAGE_KEYS.PROGRAM_ANALYSIS) !== null;
}

