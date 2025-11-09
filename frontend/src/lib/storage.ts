/**
 * Local Storage Utilities
 * Handles saving and retrieving application data from browser localStorage
 */

import type { ProgramAnalysisResponse, RequirementGroup, StudentInfo } from "../types";
import { logger } from "./logger";

const STORAGE_KEYS = {
  PROGRAM_ANALYSIS: "sharkscholar_program_analysis",
  PENDING_ANALYSIS: "sharkscholar_pending_analysis",
  STUDENT_INFO: "sharkscholar_student_info",
} as const;

interface PendingAnalysis {
  programId: string;
  programName: string;
  startTime: number;
}

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

/**
 * Save pending analysis state to localStorage
 */
export function savePendingAnalysis(programId: string, programName: string): void {
  try {
    const pending: PendingAnalysis = {
      programId,
      programName,
      startTime: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.PENDING_ANALYSIS, JSON.stringify(pending));
    logger.info("Pending analysis saved to localStorage", { programId, programName }, "Storage");
  } catch (error) {
    logger.error("Failed to save pending analysis to localStorage", error instanceof Error ? error : new Error(String(error)), "Storage");
  }
}

/**
 * Get pending analysis state from localStorage
 */
export function getPendingAnalysis(): PendingAnalysis | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.PENDING_ANALYSIS);
    if (!serialized) {
      return null;
    }
    const pending = JSON.parse(serialized) as PendingAnalysis;
    logger.info("Pending analysis retrieved from localStorage", { programId: pending.programId, programName: pending.programName }, "Storage");
    return pending;
  } catch (error) {
    logger.error("Failed to retrieve pending analysis from localStorage", error instanceof Error ? error : new Error(String(error)), "Storage");
    return null;
  }
}

/**
 * Clear pending analysis state from localStorage
 */
export function clearPendingAnalysis(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PENDING_ANALYSIS);
    logger.info("Pending analysis cleared from localStorage", undefined, "Storage");
  } catch (error) {
    logger.error("Failed to clear pending analysis from localStorage", error instanceof Error ? error : new Error(String(error)), "Storage");
  }
}

/**
 * Save student information to localStorage
 */
export function saveStudentInfo(studentInfo: StudentInfo): void {
  try {
    const serialized = JSON.stringify(studentInfo);
    localStorage.setItem(STORAGE_KEYS.STUDENT_INFO, serialized);
    logger.info("Student information saved to localStorage", {
      name: studentInfo.name,
      hasTranscript: !!studentInfo.transcriptFile,
      lastUpdated: studentInfo.lastUpdated,
    }, "Storage");
  } catch (error) {
    logger.error("Failed to save student information to localStorage", error instanceof Error ? error : new Error(String(error)), "Storage");
    throw new Error("Failed to save student information");
  }
}

/**
 * Retrieve student information from localStorage
 */
export function getStudentInfo(): StudentInfo | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.STUDENT_INFO);
    if (!serialized) {
      return null;
    }

    const studentInfo = JSON.parse(serialized) as StudentInfo;
    logger.info("Student information retrieved from localStorage", {
      name: studentInfo.name,
      hasTranscript: !!studentInfo.transcriptFile,
      lastUpdated: studentInfo.lastUpdated,
    }, "Storage");
    return studentInfo;
  } catch (error) {
    logger.error("Failed to retrieve student information from localStorage", error instanceof Error ? error : new Error(String(error)), "Storage");
    return null;
  }
}

/**
 * Check if student information exists in localStorage
 */
export function hasStudentInfo(): boolean {
  return localStorage.getItem(STORAGE_KEYS.STUDENT_INFO) !== null;
}

/**
 * Clear student information from localStorage
 */
export function clearStudentInfo(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.STUDENT_INFO);
    logger.info("Student information cleared from localStorage", undefined, "Storage");
  } catch (error) {
    logger.error("Failed to clear student information from localStorage", error instanceof Error ? error : new Error(String(error)), "Storage");
  }
}

