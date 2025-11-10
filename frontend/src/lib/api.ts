/**
 * API Client for SharkScholar Backend
 */

// NOTE: In Cloudflare Pages, set an environment variable:
// VITE_API_URL = https://sharkscholar.courses/api
// If the site serves at www, use: https://www.sharkscholar.courses/api
//----------------------------------------------------------------

import type { GeneratedPathway, PathwayGenerationRequest } from "../types/pathway";
import type { ProgramAnalysisResponse, Scholarship } from "../types";
import { logger } from "./logger";

// In production, VITE_API_URL must be set to "https://sharkscholar.courses/api" (or https://www.sharkscholar.courses/api)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

/**
 * Health check - verify backend connection
 */
export async function checkBackendHealth(): Promise<{ connected: boolean; status?: string; error?: string }> {
  try {
    logger.info("Checking backend connection", { apiUrl: API_BASE_URL }, "API");
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      logger.warn("Backend health check failed", {
        status: response.status,
        statusText: response.statusText,
        duration,
      }, "API");
      return {
        connected: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    logger.info("Backend connection successful", {
      status: data.status,
      service: data.service,
      version: data.version,
      duration,
    }, "API");

    return {
      connected: true,
      status: data.status || "healthy",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorWithContext = error instanceof Error 
      ? Object.assign(error, { apiUrl: API_BASE_URL, errorMessage })
      : { message: String(error), apiUrl: API_BASE_URL, errorMessage };
    logger.error("Backend connection failed", errorWithContext, "API");
    
    return {
      connected: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate a pathway for a career
 */
export async function generatePathway(
  request: PathwayGenerationRequest
): Promise<GeneratedPathway> {
  try {
    logger.api("POST", "/pathways/generate", request);
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/pathways/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const duration = Date.now() - startTime;
    logger.performance("pathway_generation_api", duration, {
      career: request.career,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const pathway = (await response.json()) as GeneratedPathway;
    logger.api("POST", "/pathways/generate", request, pathway);
    return pathway;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: "/pathways/generate", request })
      : { message: String(error), endpoint: "/pathways/generate", request };
    logger.error("Failed to generate pathway", errorWithContext);
    throw error;
  }
}

/**
 * Get a cached pathway for a career
 */
export async function getPathway(career: string): Promise<GeneratedPathway | null> {
  try {
    logger.api("GET", `/pathways/${career}`);
    const encodedCareer = encodeURIComponent(career);
    const response = await fetch(`${API_BASE_URL}/pathways/${encodedCareer}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const pathway = (await response.json()) as GeneratedPathway;
    logger.api("GET", `/pathways/${career}`, undefined, pathway);
    return pathway;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: `/pathways/${career}` })
      : { message: String(error), endpoint: `/pathways/${career}` };
    logger.error("Failed to get pathway", errorWithContext);
    throw error;
  }
}

/**
 * Get list of available careers
 */
export async function getCareers(): Promise<string[]> {
  try {
    logger.api("GET", "/careers");
    const response = await fetch(`${API_BASE_URL}/careers`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as { careers: string[] };
    logger.api("GET", "/careers", undefined, data);
    return data.careers;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: "/careers" })
      : { message: String(error), endpoint: "/careers" };
    logger.error("Failed to get careers", errorWithContext);
    throw error;
  }
}

/**
 * Analyze program PDFs and extract structured information
 */
export async function analyzeProgramPDFs(
  courseListFile: File,
  sequenceGuideFile: File
): Promise<ProgramAnalysisResponse> {
  try {
    logger.api("POST", "/programs/analyze", {
      courseListName: courseListFile.name,
      sequenceGuideName: sequenceGuideFile.name,
    });
    const startTime = Date.now();

    const formData = new FormData();
    formData.append("courseList", courseListFile);
    formData.append("sequenceGuide", sequenceGuideFile);

    const response = await fetch(`${API_BASE_URL}/programs/analyze`, {
      method: "POST",
      body: formData,
    });

    const duration = Date.now() - startTime;
    logger.performance("pdf_analysis_api", duration, {
      courseListSize: courseListFile.size,
      sequenceGuideSize: sequenceGuideFile.size,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const analysis = await response.json();
    logger.api("POST", "/programs/analyze", undefined, analysis);
    return analysis;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: "/programs/analyze" })
      : { message: String(error), endpoint: "/programs/analyze" };
    logger.error("Failed to analyze PDFs", errorWithContext);
    throw error;
  }
}

/**
 * Get programs by career
 */
export async function getProgramsByCareer(career: string): Promise<{ career: string; programs: any[] }> {
  try {
    logger.api("GET", `/programs/by-career/${career}`);
    const encodedCareer = encodeURIComponent(career);
    const response = await fetch(`${API_BASE_URL}/programs/by-career/${encodedCareer}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    logger.api("GET", `/programs/by-career/${career}`, undefined, data);
    return data;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: `/programs/by-career/${career}` })
      : { message: String(error), endpoint: `/programs/by-career/${career}` };
    logger.error("Failed to get programs by career", errorWithContext);
    throw error;
  }
}

/**
 * Search programs by career (fuzzy search)
 */
export async function searchPrograms(searchTerm: string): Promise<{ searchTerm: string; programs: any[] }> {
  try {
    logger.api("GET", `/programs/search?q=${searchTerm}`);
    const encodedSearch = encodeURIComponent(searchTerm);
    const response = await fetch(`${API_BASE_URL}/programs/search?q=${encodedSearch}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    logger.api("GET", `/programs/search`, undefined, data);
    return data;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: `/programs/search` })
      : { message: String(error), endpoint: `/programs/search` };
    logger.error("Failed to search programs", errorWithContext);
    throw error;
  }
}

/**
 * Get programs by field
 */
export async function getProgramsByField(field: string): Promise<{ field: string; mappings: any[] }> {
  try {
    logger.api("GET", `/programs/by-field/${field}`);
    const encodedField = encodeURIComponent(field);
    const response = await fetch(`${API_BASE_URL}/programs/by-field/${encodedField}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    logger.api("GET", `/programs/by-field/${field}`, undefined, data);
    return data;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: `/programs/by-field/${field}` })
      : { message: String(error), endpoint: `/programs/by-field/${field}` };
    logger.error("Failed to get programs by field", errorWithContext);
    throw error;
  }
}

/**
 * Get all fields
 */
export async function getFields(): Promise<string[]> {
  try {
    logger.api("GET", "/fields");
    const response = await fetch(`${API_BASE_URL}/fields`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    logger.api("GET", "/fields", undefined, data);
    return data.fields;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: "/fields" })
      : { message: String(error), endpoint: "/fields" };
    logger.error("Failed to get fields", errorWithContext);
    throw error;
  }
}

/**
 * Analyze program automatically by fetching PDFs from MDC
 */
export async function analyzeProgramById(programId: string, signal?: AbortSignal): Promise<ProgramAnalysisResponse> {
  try {
    logger.api("POST", `/programs/${programId}/analyze`);
    const startTime = Date.now();
    const encodedProgramId = encodeURIComponent(programId);

    const response = await fetch(`${API_BASE_URL}/programs/${encodedProgramId}/analyze`, {
      method: "POST",
      signal,
    });

    const duration = Date.now() - startTime;
    logger.performance("program_auto_analysis_api", duration, { programId });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const analysis = await response.json();
    logger.api("POST", `/programs/${programId}/analyze`, undefined, analysis);
    return analysis;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: `/programs/${programId}/analyze` })
      : { message: String(error), endpoint: `/programs/${programId}/analyze` };
    logger.error("Failed to analyze program", errorWithContext);
    throw error;
  }
}

/**
 * Generate a scholarship proposal
 */
export async function generateProposal(
  scholarship: Scholarship,
  studentInfo: {
    name: string;
    program: string;
    additionalNotes?: string;
    gpa?: number;
    classStanding?: string;
    achievements?: string;
    workExperience?: string;
    extracurricularActivities?: string;
    careerGoals?: string;
    financialNeed?: string;
    isFirstGeneration?: boolean;
    isVeteran?: boolean;
    isInternationalStudent?: boolean;
    raceEthnicity?: string;
  },
  supportingDocument?: File
): Promise<string> {
  try {
    logger.api("POST", "/proposals/generate", { scholarshipId: scholarship.id });
    const startTime = Date.now();

    const formData = new FormData();
    formData.append("scholarship", JSON.stringify(scholarship));
    formData.append("studentInfo", JSON.stringify(studentInfo));
    
    if (supportingDocument) {
      formData.append("supportingDocument", supportingDocument);
    }

    const response = await fetch(`${API_BASE_URL}/proposals/generate`, {
      method: "POST",
      body: formData,
    });

    const duration = Date.now() - startTime;
    logger.performance("proposal_generation_api", duration, {
      scholarshipId: scholarship.id,
      hasSupportingDocument: !!supportingDocument,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    logger.api("POST", "/proposals/generate", { scholarshipId: scholarship.id }, data);
    return data.proposal;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: "/proposals/generate", scholarshipId: scholarship.id })
      : { message: String(error), endpoint: "/proposals/generate", scholarshipId: scholarship.id };
    logger.error("Failed to generate proposal", errorWithContext, "API");
    throw error;
  }
}

/**
 * Process transcript PDF to extract student information
 */
export async function processTranscriptPDF(transcriptFile: File): Promise<{
  name?: string;
  institution?: string;
  gpa?: number;
  program?: string;
  classStanding?: string;
  courses?: Array<{
    code: string;
    title: string;
    credits: number;
    grade?: string;
  }>;
  totalCredits?: number;
  graduationDate?: string;
  scholarships?: import("../types").Scholarship[];
}> {
  try {
    logger.api("POST", "/student/process-transcript", {
      fileName: transcriptFile.name,
      fileSize: transcriptFile.size,
    });
    const startTime = Date.now();

    const formData = new FormData();
    formData.append("transcript", transcriptFile);

    const response = await fetch(`${API_BASE_URL}/student/process-transcript`, {
      method: "POST",
      body: formData,
    });

    const duration = Date.now() - startTime;
    logger.performance("transcript_processing_api", duration, {
      fileSize: transcriptFile.size,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const analysis = await response.json();
    logger.api("POST", "/student/process-transcript", undefined, analysis);
    return analysis;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: "/student/process-transcript" })
      : { message: String(error), endpoint: "/student/process-transcript" };
    logger.error("Failed to process transcript", errorWithContext);
    throw error;
  }
}

/**
 * Process resume PDF to extract student information
 */
export async function processResumePDF(resumeFile: File): Promise<{
  name?: string;
  email?: string;
  phone?: string;
  workExperience?: string;
  achievements?: string;
  skills?: string[];
  education?: Array<{
    degree: string;
    institution: string;
    year?: string;
  }>;
  certifications?: string[];
  extracurricularActivities?: string;
  scholarships?: import("../types").Scholarship[];
}> {
  try {
    logger.api("POST", "/student/process-resume", {
      fileName: resumeFile.name,
      fileSize: resumeFile.size,
    });
    const startTime = Date.now();

    const formData = new FormData();
    formData.append("resume", resumeFile);

    const response = await fetch(`${API_BASE_URL}/student/process-resume`, {
      method: "POST",
      body: formData,
    });

    const duration = Date.now() - startTime;
    logger.performance("resume_processing_api", duration, {
      fileSize: resumeFile.size,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const analysis = await response.json();
    logger.api("POST", "/student/process-resume", undefined, analysis);
    return analysis;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: "/student/process-resume" })
      : { message: String(error), endpoint: "/student/process-resume" };
    logger.error("Failed to process resume", errorWithContext);
    throw error;
  }
}

/**
 * Fetch relevant scholarships based on student information
 */
export async function fetchRelevantScholarships(studentInfo: {
  program?: string;
  gpa?: number;
  raceEthnicity?: string;
  isFirstGeneration?: boolean;
  isVeteran?: boolean;
  isInternationalStudent?: boolean;
  classStanding?: string;
  [key: string]: any;
}): Promise<{ scholarships: any[] }> {
  try {
    logger.api("POST", "/scholarships/relevant", studentInfo);
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/scholarships/relevant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(studentInfo),
    });

    const duration = Date.now() - startTime;
    logger.performance("scholarship_fetch_api", duration, {
      hasProgram: !!studentInfo.program,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    logger.api("POST", "/scholarships/relevant", undefined, data);
    return data;
  } catch (error) {
    const errorWithContext = error instanceof Error
      ? Object.assign(error, { endpoint: "/scholarships/relevant" })
      : { message: String(error), endpoint: "/scholarships/relevant" };
    logger.error("Failed to fetch relevant scholarships", errorWithContext);
    throw error;
  }
}

