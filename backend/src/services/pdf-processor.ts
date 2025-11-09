/**
 * PDF Processing Service
 * Processes PDF files and extracts program information using Gemini API
 */

import { logger } from "../lib/logger";
import type { ProgramAnalysisResponse, RequirementGroup } from "../types";

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

I'm providing you with two PDF documents in this exact order:
1. FIRST PDF (Complete Course List) - This is the CANONICAL and PRIMARY source for all course information
2. SECOND PDF (Course Sequence Guide) - This is SECONDARY and should only be used for supplementary information

IMPORTANT: The first PDF data you receive is the Complete Course List. The second PDF data is the Course Sequence Guide.

PRIORITY INSTRUCTIONS:
- Extract ALL course information (course codes, credits, prerequisites, corequisites, competencies, elective rules, requirement groups) from the Complete Course List PDF
- The Complete Course List PDF is the authoritative source for:
  * Course codes and titles
  * Credit hours
  * Prerequisites and corequisites
  * Course descriptions
  * Requirement groupings (e.g., "Social Sciences", "Oral Communications", etc.)
  * Elective rules (how many credits needed from each group)
  * Stand-alone required courses
- Only use the Course Sequence Guide PDF for:
  * Additional information about certifications (if not in Course List)
  * Additional information about exams (if not in Course List)
  * Additional information about internships (if not in Course List)
  * Recommended sequencing hints (but prioritize Course List structure)

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
  "requirements": {
    "groups": [
      {
        "name": "Exact requirement group name from documents (e.g., 'GENERAL EDUCATION REQUIREMENTS', 'LOWER DIVISION REQUIREMENTS', 'UPPER DIVISION REQUIREMENTS', 'PROGRAM ELECTIVES', etc.)",
        "requiredCredits": number,
        "description": "Optional description or notes (e.g., 'Any transferrable type-1 or type-2 courses')",
        "courses": [
          {
            "code": "e.g., PSY2012",
            "title": "Course title",
            "credits": number,
            "prerequisites": ["course codes"],
            "corequisite": "course code if any",
            "description": "Course description if available",
            "semester": "FALL" | "SPRING" | "SUMMER" (if specified),
            "year": number (if specified)
          },
          {
            "code": "CAI*"
          }
        ],
        "groups": [
          {
            "name": "Nested subgroup name (e.g., 'COMMUNICATIONS', 'ORAL COMMUNICATIONS', 'HUMANITIES', 'State Core', 'MDC Core', 'Group A', 'Group B', etc.)",
            "requiredCredits": number,
            "description": "Optional description or notes",
            "courses": [
              {
                "code": "e.g., SPC1017",
                "title": "Course title",
                "credits": number,
                "prerequisites": ["course codes"],
                "corequisite": "course code if any",
                "description": "Course description if available",
                "semester": "FALL" | "SPRING" | "SUMMER" (if specified),
                "year": number (if specified)
              },
              {
                "code": "CAP*"
              }
            ],
            "groups": [
              {
                "name": "Further nested groups if needed (e.g., 'State Core', 'MDC Core' within 'HUMANITIES')",
                "requiredCredits": number,
                "description": "Optional description",
                "courses": [
                  {
                    "code": "e.g., ARH2000",
                    "title": "Course title",
                    "credits": number,
                    "prerequisites": ["course codes"],
                    "corequisite": "course code if any",
                    "description": "Course description if available"
                  },
                  {
                    "code": "CEN*"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
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

IMPORTANT INSTRUCTIONS:
1. PRIMARY SOURCE: Extract ALL course-related information from the Complete Course List PDF. This includes:
   - Course codes, titles, credits
   - Prerequisites and corequisites
   - Course descriptions
   - Requirement group names and credit requirements
   - Hierarchical/nested group structures
   - Elective rules and groupings
2. SECONDARY SOURCE: Only use the Course Sequence Guide PDF for:
   - Certifications (if not found in Course List)
   - Exams (if not found in Course List)
   - Internships (if not found in Course List)
   - Sequencing hints (but Course List structure takes priority)
3. ALL courses must be organized in groups. There are NO stand-alone courses - everything belongs to a group.
4. Groups can be nested (groups within groups) to represent hierarchical requirements. Examples:
   - "GENERAL EDUCATION REQUIREMENTS" (36 credits) contains:
     * "COMMUNICATIONS" (6 credits) contains:
       - "ORAL COMMUNICATIONS" (3 credits) with courses
     * "HUMANITIES" (6 credits) contains:
       - "State Core" (3 credits) with courses
       - "MDC Core" (3 credits) with courses
   - "LOWER DIVISION REQUIREMENTS" (36 credits) contains:
     * "Group A" (12 credits) with courses
     * "Group B" (4 credits) with courses
     * "Group C" (16 credits) with description "Any transferrable type-1 or type-2 courses"
5. Use the EXACT requirement group names as they appear in the Complete Course List PDF (e.g., "GENERAL EDUCATION REQUIREMENTS", "COMMUNICATIONS", "ORAL COMMUNICATIONS", "LOWER DIVISION REQUIREMENTS", "UPPER DIVISION REQUIREMENTS", "PROGRAM ELECTIVES", etc.).
6. For each requirement group, specify the exact number of credits required from that group (from the Course List PDF).
7. A group can have EITHER:
   - "courses" array (if it's a leaf group with actual courses)
   - "groups" array (if it's a parent group with nested subgroups)
   - Both (if it has both direct courses and subgroups)
8. CRITICAL: When a group description mentions course prefixes or patterns (e.g., "CAI*, CAP*, CEN*, CET, CGS*, CIS*, CNT*, COP*, CTS*"), you MUST:
   - Add each prefix/pattern directly to the "courses" array as a course object
   - Use ONLY the "code" field with the pattern (e.g., "CAI*", "CAP*", "CEN*")
   - Do NOT include title, credits, prerequisites, or other fields for pattern codes
   - Example: If description says "CAI*, CAP*, CEN*", the courses array should be: [{"code": "CAI*"}, {"code": "CAP*"}, {"code": "CEN*"}]
   - The asterisk (*) means "any course with that prefix" - just use the pattern code as-is
9. For actual courses (not patterns), include ALL course information: title, credits, prerequisites, corequisites, descriptions, recommended semesters/years (all from Course List PDF).
10. For pattern codes (e.g., "CAI*", "CAP*"), only include the "code" field - no title, credits, prerequisites, or other fields needed.
11. If a course has no prerequisites, use an empty array [].
12. Include "description" field for groups that have special notes or rules (e.g., "Any transferrable type-1 or type-2 courses. Please see academic advisor").
13. If there's conflicting information between the two PDFs, ALWAYS prioritize the Complete Course List PDF.`;

    const startTime = Date.now();

    // Retry configuration for handling transient errors (503, 429, etc.)
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds base delay
    let lastError: Error | null = null;
    let response: Response | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = baseDelay * Math.pow(2, attempt - 1);
          logger.info(`Retrying Gemini API request (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms delay`, {
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            delay,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Use Gemini 2.5 Pro with v1beta API for PDF processing
        response = await fetch(
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

        if (response.ok) {
          // Success - break out of retry loop
          break;
        }

        // Check if error is retryable (503, 429, 500, 502, 504)
        const isRetryable = response.status === 503 || 
                           response.status === 429 || 
                           response.status === 500 || 
                           response.status === 502 || 
                           response.status === 504;

        const errorText = await response.text();
        lastError = new Error(`HTTP ${response.status}: ${errorText}`);

        if (!isRetryable || attempt === maxRetries) {
          // Non-retryable error or max retries reached
          logger.error("Gemini API error for PDF processing", lastError, {
            status: response.status,
            statusText: response.statusText,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
          });
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        // Retryable error - log and continue to retry
        logger.warn(`Gemini API returned retryable error (attempt ${attempt + 1}/${maxRetries + 1})`, {
          status: response.status,
          statusText: response.statusText,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          error: errorText.substring(0, 200),
        });

      } catch (error) {
        // Network or other errors
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          logger.error("Gemini API request failed after all retries", lastError, {
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
          });
          throw lastError;
        }

        logger.warn(`Gemini API request failed (attempt ${attempt + 1}/${maxRetries + 1}), will retry`, {
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
        });
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error("Failed to get response from Gemini API");
    }

    const duration = Date.now() - startTime;
    logger.performance("gemini_pdf_processing", duration, {
      courseListSize: courseListPDF.byteLength,
      sequenceGuideSize: sequenceGuidePDF.byteLength,
      retries: response.status === 200 ? 0 : maxRetries, // This won't be accurate, but it's logged above
    });

    const data = (await response.json()) as GeminiResponse;
    const aiText = data.candidates[0]?.content.parts[0]?.text;

    if (!aiText) {
      throw new Error("Gemini API returned empty response");
    }

    logger.ai("response", {
      operation: "process_pdfs",
      responseLength: aiText.length,
    });

    // Log the full Gemini output
    logger.info("Gemini API response output", {
      operation: "process_pdfs",
      responseLength: aiText.length,
      response: aiText,
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
      
      logger.info("Successfully processed PDFs", {
        degreeType: analysis.degreeType,
        programName: analysis.programName,
        topLevelGroups: analysis.requirements.groups.length,
        totalCourses,
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

