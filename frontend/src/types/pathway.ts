/**
 * Backend Pathway Types
 * These match the backend types for pathway generation
 */

export type DegreeLevel = "AA" | "AS" | "BS" | "BA" | "MS" | "MA" | "PhD" | "CERT";

export type Institution = "MDC" | "FIU" | "UF" | "FSU" | "OTHER";

export type Semester = "FALL" | "SPRING" | "SUMMER";

export interface Course {
  code: string;
  title: string;
  credits: number;
  prerequisites?: string[];
  corequisite?: string;
  description?: string;
  semester?: Semester;
  year?: number;
}

export interface Exam {
  name: string;
  description: string;
  required: boolean;
  timing?: string;
  scoreRequirements?: {
    minimum?: number;
    recommended?: number;
  };
}

export interface Internship {
  type: "REQUIRED" | "OPTIONAL" | "RECOMMENDED";
  timing: string;
  description: string;
  duration?: string;
}

export interface Certification {
  name: string;
  description: string;
  required: boolean;
  timing?: string;
  prerequisites?: string[];
}

export interface PathwayLevel {
  level: DegreeLevel;
  institution: Institution;
  programName: string;
  description?: string;
  courses: Course[];
  transferTargets?: unknown[];
  internships?: Internship[];
  exams?: Exam[];
  certifications?: Certification[];
  requirements?: {
    gpa?: number;
    prerequisites?: string[];
    additionalCourses?: Course[];
  };
  duration?: string;
  startSemester?: Semester;
  startYear?: number;
}

export interface AlternativePathway {
  name: string;
  description: string;
  levels: PathwayLevel[];
}

export interface GeneratedPathway {
  career: string;
  primaryPathway: PathwayLevel[];
  alternativePathways: AlternativePathway[];
  totalDuration?: string;
  metadata: {
    generatedAt: string;
    source: string;
    aiEnhanced: boolean;
    cached?: boolean;
    aiRecommendations?: string;
  };
}

export interface PathwayGenerationRequest {
  career: string;
  startingInstitution?: Institution;
  targetInstitutions?: Institution[];
  includeGraduate?: boolean;
  includeCertifications?: boolean;
}

