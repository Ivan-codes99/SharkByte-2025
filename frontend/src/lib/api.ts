/**
 * API Client for PathFundAI Backend
 */

import type { GeneratedPathway, PathwayGenerationRequest } from "../types/pathway";
import type { ProgramAnalysisResponse } from "../types";
import { logger } from "./logger";

// Backend API URL - adjust for your deployment
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

/**
 * Health check - verify backend connection
 */
export async function checkBackendHealth(): Promise<{ connected: boolean; status?: string; error?: string }> {
  try {
    logger.info("Checking backend connection", { apiUrl: API_BASE_URL }, "API");
    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
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

