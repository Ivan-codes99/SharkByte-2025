/**
 * Gemini API Integration
 * Uses Google's Gemini API to enhance pathway generation with AI recommendations
 */

import type { GeneratedPathway, PathwayLevel, AlternativePathway } from "../types";
import { logger } from "./logger";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

/**
 * Call Gemini API to enhance pathway with AI recommendations
 */
export async function enhancePathwayWithAI(
  pathway: GeneratedPathway,
  apiKey: string
): Promise<GeneratedPathway> {
  const prompt = `You are an educational pathway advisor for Miami Dade College students.

Given this career pathway for "${pathway.career}", provide AI-enhanced recommendations:

${JSON.stringify(pathway, null, 2)}

Please provide:
1. Optimal timing for internships (when they fit best in the timeline)
2. Recommended GRE exam timing
3. Suggestions for pacing between milestones
4. Any missing prerequisites or recommended courses
5. Alternative pathway recommendations

Return your response as a JSON object with the same structure, but with enhanced recommendations added to the appropriate levels.`;

  try {
    logger.ai("request", { operation: "enhance_pathway", career: pathway.career });
    const startTime = Date.now();
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const duration = Date.now() - startTime;
    logger.performance("gemini_api_request", duration, { operation: "enhance_pathway" });

    if (!response.ok) {
      const errorText = await response.text();
      logger.ai("error", { 
        operation: "enhance_pathway", 
        status: response.status, 
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const aiText = data.candidates[0]?.content.parts[0]?.text;

    logger.ai("response", { 
      operation: "enhance_pathway", 
      responseLength: aiText?.length || 0,
    });

    if (!aiText) {
      logger.warn("Gemini API returned empty response", { career: pathway.career });
      return pathway; // Return original if AI fails
    }

    // Try to parse AI response as JSON
    try {
      const aiEnhanced = JSON.parse(aiText) as GeneratedPathway;
      logger.ai("enhance", { career: pathway.career, success: true });
      return {
        ...pathway,
        ...aiEnhanced,
        metadata: {
          ...pathway.metadata,
          aiEnhanced: true,
        },
      };
    } catch (parseError) {
      logger.warn("Failed to parse Gemini JSON response, using as text recommendations", {
        career: pathway.career,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      // If parsing fails, use AI text as recommendations
      return {
        ...pathway,
        metadata: {
          ...pathway.metadata,
          aiEnhanced: true,
          aiRecommendations: aiText,
        },
      };
    }
  } catch (error) {
    logger.ai("error", { operation: "enhance_pathway", career: pathway.career });
    logger.error("Gemini API error", error instanceof Error ? error : new Error(String(error)), {
      operation: "enhance_pathway",
    });
    return pathway; // Return original pathway on error
  }
}

/**
 * Use Gemini to fill in missing program information
 */
export async function fillMissingProgramInfo(
  programName: string,
  partialData: Partial<PathwayLevel>,
  apiKey: string
): Promise<PathwayLevel> {
  const prompt = `Fill in missing information for this educational program:

Program: ${programName}
Partial Data: ${JSON.stringify(partialData, null, 2)}

Provide complete course sequences, prerequisites, and requirements in JSON format matching the PathwayLevel structure.`;

  try {
    logger.ai("request", { operation: "fill_missing_info", programName });
    const startTime = Date.now();
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const duration = Date.now() - startTime;
    logger.performance("gemini_api_request", duration, { operation: "fill_missing_info" });

    if (!response.ok) {
      logger.ai("error", { 
        operation: "fill_missing_info", 
        programName,
        status: response.status,
      });
      return partialData as PathwayLevel;
    }

    const data = (await response.json()) as GeminiResponse;
    const aiText = data.candidates[0]?.content.parts[0]?.text;

    logger.ai("response", { operation: "fill_missing_info", programName, responseLength: aiText?.length || 0 });

    if (aiText) {
      try {
        const filled = JSON.parse(aiText) as PathwayLevel;
        logger.debug("Successfully filled missing program info", { programName });
        return filled;
      } catch (parseError) {
        logger.warn("Failed to parse Gemini response for fill_missing_info", {
          programName,
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
        return partialData as PathwayLevel;
      }
    }

    return partialData as PathwayLevel;
  } catch (error) {
    logger.ai("error", { operation: "fill_missing_info", programName });
    logger.error("Gemini API error", error instanceof Error ? error : new Error(String(error)), {
      operation: "fill_missing_info",
    });
    return partialData as PathwayLevel;
  }
}

/**
 * Generate alternative pathway recommendations using AI
 */
export async function generateAlternativePathways(
  career: string,
  primaryPathway: PathwayLevel[],
  apiKey: string
): Promise<AlternativePathway[]> {
  const prompt = `Generate alternative educational pathways for a "${career}" career.

Primary Pathway:
${JSON.stringify(primaryPathway, null, 2)}

Suggest 2-3 alternative pathways (e.g., different transfer institutions, accelerated paths, or different degree sequences).
Return as JSON array of AlternativePathway objects.`;

  try {
    logger.ai("request", { operation: "generate_alternatives", career });
    const startTime = Date.now();
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const duration = Date.now() - startTime;
    logger.performance("gemini_api_request", duration, { operation: "generate_alternatives" });

    if (!response.ok) {
      logger.ai("error", { 
        operation: "generate_alternatives", 
        career,
        status: response.status,
      });
      return [];
    }

    const data = (await response.json()) as GeminiResponse;
    const aiText = data.candidates[0]?.content.parts[0]?.text;

    logger.ai("response", { 
      operation: "generate_alternatives", 
      career,
      responseLength: aiText?.length || 0,
    });

    if (aiText) {
      try {
        const alternatives = JSON.parse(aiText) as AlternativePathway[];
        logger.info("Generated alternative pathways", { career, count: alternatives.length });
        return alternatives;
      } catch (parseError) {
        logger.warn("Failed to parse Gemini response for alternatives", {
          career,
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
        return [];
      }
    }

    return [];
  } catch (error) {
    logger.ai("error", { operation: "generate_alternatives", career });
    logger.error("Gemini API error", error instanceof Error ? error : new Error(String(error)), {
      operation: "generate_alternatives",
    });
    return [];
  }
}

