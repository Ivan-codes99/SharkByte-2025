/**
 * Core types for educational pathway generation
 */

export type DegreeLevel = "AA" | "AS" | "BS" | "BA" | "MS" | "MA" | "PhD" | "CERT";

export type Institution = "MDC" | "FIU" | "UF" | "FSU" | "OTHER";

export type Semester = "FALL" | "SPRING" | "SUMMER";

export interface Course {
  code: string; // e.g., "COP2271"
  title: string;
  credits: number;
  prerequisites?: string[]; // Course codes
  corequisite?: string; // Course code
  description?: string;
  semester?: Semester; // Recommended semester
  year?: number; // Recommended year
}

export interface Program {
  name: string;
  description: string;
  institution: Institution;
  degreeLevel: DegreeLevel;
  totalCredits: number;
  courses: Course[];
  requirements?: {
    gpa?: number;
    prerequisites?: string[];
    exams?: Exam[];
  };
}

export interface Exam {
  name: string; // e.g., "FE Exam", "GRE"
  description: string;
  required: boolean;
  timing?: string; // e.g., "Before graduation", "Before MS admission"
  scoreRequirements?: {
    minimum?: number;
    recommended?: number;
  };
}

export interface TransferTarget {
  institution: Institution;
  programName: string;
  articulationAgreement: boolean;
  transferEquivalencies: {
    mdcCourse: string;
    targetCourse: string;
    credits: number;
  }[];
  requirements: {
    gpa?: number;
    prerequisites?: string[];
    additionalCourses?: Course[];
  };
}

export interface Internship {
  type: "REQUIRED" | "OPTIONAL" | "RECOMMENDED";
  timing: string; // e.g., "Summer after sophomore year"
  description: string;
  duration?: string; // e.g., "3 months"
}

export interface Certification {
  name: string; // e.g., "AWS Solutions Architect"
  description: string;
  required: boolean;
  timing?: string; // e.g., "After BS degree"
  prerequisites?: string[];
}

export interface PathwayLevel {
  level: DegreeLevel;
  institution: Institution;
  programName: string;
  description?: string;
  courses: Course[];
  transferTargets?: TransferTarget[];
  internships?: Internship[];
  exams?: Exam[];
  certifications?: Certification[];
  requirements?: {
    gpa?: number;
    prerequisites?: string[];
    additionalCourses?: Course[];
  };
  duration?: string; // e.g., "2 years", "4 semesters"
  startSemester?: Semester;
  startYear?: number;
}

export interface AlternativePathway {
  name: string; // e.g., "FIU Transfer Path", "UF Transfer Path"
  description: string;
  levels: PathwayLevel[];
}

export interface GeneratedPathway {
  career: string; // e.g., "Computer Scientist", "Mechanical Engineer"
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
  startingInstitution?: Institution; // Default: MDC
  targetInstitutions?: Institution[]; // e.g., ["FIU", "UF"]
  includeGraduate?: boolean; // Include MS/PhD
  includeCertifications?: boolean;
}

/**
 * Response type for PDF processing
 */
export interface ProgramAnalysisResponse {
  degreeType: DegreeLevel; // AA, AS, BS, BA, etc.
  programName: string;
  institution: Institution;
  metadata: {
    totalCredits?: number;
    duration?: string;
    description?: string;
  };
  courses: Course[];
  certifications?: {
    required: Certification[];
    recommended: Certification[];
  };
  exams?: Exam[];
  internships?: Internship[];
}
