/**
 * PDF Processing Service
 * Processes PDF files and extracts program information using Gemini API
 */

import { logger } from "../lib/logger";
import type { ProgramAnalysisResponse } from "../types";

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
 * Process PDF files and extract program information using Gemini
 */
export async function processProgramPDFs(
  courseListPDF: ArrayBuffer,
  sequenceGuidePDF: ArrayBuffer,
  apiKey: string
): Promise<ProgramAnalysisResponse> {
  try {
    logger.info("Processing program PDFs with Gemini", {
      courseListSize: courseListPDF.byteLength,
      sequenceGuideSize: sequenceGuidePDF.byteLength,
    });

    // Convert PDFs to base64 for Gemini API
    const courseListBase64 = arrayBufferToBase64(courseListPDF);
    const sequenceGuideBase64 = arrayBufferToBase64(sequenceGuidePDF);

    const prompt = `You are an educational pathway analyzer for Miami Dade College programs.

I'm providing you with two PDF documents:
1. Complete Course List - contains all courses in the program
2. Course Sequence Guide - contains the recommended sequence and prerequisites

Please analyze these documents and extract the following information in JSON format:

{
  "degreeType": "AA" | "AS" | "BS" | "BA" | "MS" | "MA" | "PhD" | "CERT",
  "programName": "Full program name",
  "institution": "MDC" | "FIU" | "UF" | "FSU" | "OTHER",
  "metadata": {
    "totalCredits": number,
    "duration": "e.g., 2 years or 4 semesters",
    "description": "Brief program description"
  },
  "courses": [
    {
      "code": "e.g., COP2271",
      "title": "Course title",
      "credits": number,
      "prerequisites": ["course codes"],
      "corequisite": "course code if any",
      "description": "Course description if available",
      "semester": "FALL" | "SPRING" | "SUMMER" (if specified),
      "year": number (if specified)
    }
  ],
  "certifications": {
    "required": [
      {
        "name": "Certification name",
        "description": "Description",
        "required": true,
        "timing": "When to obtain",
        "prerequisites": []
      }
    ],
    "recommended": [
      {
        "name": "Certification name",
        "description": "Description",
        "required": false,
        "timing": "When to obtain",
        "prerequisites": []
      }
    ]
  },
  "exams": [
    {
      "name": "Exam name",
      "description": "Description",
      "required": true/false,
      "timing": "When to take",
      "scoreRequirements": {
        "minimum": number,
        "recommended": number
      }
    }
  ],
  "internships": [
    {
      "type": "REQUIRED" | "OPTIONAL" | "RECOMMENDED",
      "timing": "When to complete",
      "description": "Description",
      "duration": "e.g., 3 months"
    }
  ]
}

Extract all course information including prerequisites, corequisites, and recommended sequencing. Identify any certifications, exams, or internships mentioned in the documents.`;

    const startTime = Date.now();

    // Use Gemini 2.5 Pro with v1beta API for PDF processing
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
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
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: courseListBase64,
                  },
                },
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: sequenceGuideBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const duration = Date.now() - startTime;
    logger.performance("gemini_pdf_processing", duration, {
      courseListSize: courseListPDF.byteLength,
      sequenceGuideSize: sequenceGuidePDF.byteLength,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Gemini API error for PDF processing", new Error(errorText), {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const aiText = data.candidates[0]?.content.parts[0]?.text;

    if (!aiText) {
      throw new Error("Gemini API returned empty response");
    }

    logger.ai("response", {
      operation: "process_pdfs",
      responseLength: aiText.length,
    });

    // Extract JSON from the response (may be wrapped in markdown code blocks)
    let jsonText = aiText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    try {
      const analysis = JSON.parse(jsonText) as ProgramAnalysisResponse;
      logger.info("Successfully processed PDFs", {
        degreeType: analysis.degreeType,
        programName: analysis.programName,
        courseCount: analysis.courses.length,
      });
      return analysis;
    } catch (parseError) {
      logger.error("Failed to parse Gemini response", parseError instanceof Error ? parseError : new Error(String(parseError)), {
        responsePreview: aiText.substring(0, 500),
      });
      throw new Error("Failed to parse program analysis from Gemini response");
    }
  } catch (error) {
    logger.error("PDF processing error", error instanceof Error ? error : new Error(String(error)), {
      operation: "process_pdfs",
    });
    throw error;
  }
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

