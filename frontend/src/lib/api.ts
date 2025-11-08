/**
 * API Client for PathFundAI Backend
 */

import type { GeneratedPathway, PathwayGenerationRequest } from "../types/pathway";
import { logger } from "./logger";

// Backend API URL - adjust for your deployment
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

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
    logger.error("Failed to generate pathway", error instanceof Error ? error : new Error(String(error)), {
      endpoint: "/pathways/generate",
      request,
    });
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
    logger.error("Failed to get pathway", error instanceof Error ? error : new Error(String(error)), {
      endpoint: `/pathways/${career}`,
    });
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
    logger.error("Failed to get careers", error instanceof Error ? error : new Error(String(error)), {
      endpoint: "/careers",
    });
    throw error;
  }
}

