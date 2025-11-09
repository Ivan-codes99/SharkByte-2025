/**
 * Student Document Processing Service
 * Processes transcript and resume PDFs to extract student information
 */

import { logger } from "../lib/logger";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface TranscriptAnalysis {
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
  scholarships?: Scholarship[];
}

export interface ResumeAnalysis {
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
  scholarships?: Scholarship[];
}

export interface Scholarship {
  id: string;
  title: string;
  awardUSD: number;
  deadlineISO: string;
  programTags: string[];
  essayWords?: number;
  url?: string;
  blurb: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Process transcript PDF to extract student information
 */
export async function processTranscriptPDF(
  transcriptPDF: ArrayBuffer,
  apiKey: string
): Promise<TranscriptAnalysis> {
  try {
    logger.info("Processing transcript PDF with Gemini", {
      transcriptSize: transcriptPDF.byteLength,
    });

    const transcriptBase64 = arrayBufferToBase64(transcriptPDF);

    const prompt = `You are analyzing a student transcript PDF. Extract the following information and return it as JSON:

{
  "name": "Student's full name",
  "institution": "Name of the institution/university",
  "gpa": number (overall GPA if available),
  "program": "Program/major name if visible",
  "classStanding": "FRESHMAN" | "SOPHOMORE" | "JUNIOR" | "SENIOR" | "GRADUATE" | null,
  "courses": [
    {
      "code": "Course code (e.g., COP2271)",
      "title": "Course title",
      "credits": number,
      "grade": "Letter grade if available"
    }
  ],
  "totalCredits": number (total credits earned),
  "graduationDate": "Expected or actual graduation date if available"
}

Extract all available information from the transcript. If a field is not available, use null or omit it.`;

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
                    data: transcriptBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Gemini API error for transcript processing", new Error(errorText));
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const aiText = data.candidates[0]?.content.parts[0]?.text;

    if (!aiText) {
      logger.warn("Gemini API returned empty response for transcript");
      return {};
    }

    // Try to extract JSON from the response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const analysis = JSON.parse(jsonMatch[0]) as TranscriptAnalysis;
        logger.info("Successfully extracted transcript information", {
          hasName: !!analysis.name,
          hasGPA: !!analysis.gpa,
          hasInstitution: !!analysis.institution,
        });
        
        // Find relevant scholarships based on extracted information
        try {
          const scholarshipResult = await findRelevantScholarships(
            {
              program: analysis.program,
              gpa: analysis.gpa,
              classStanding: analysis.classStanding,
              institution: analysis.institution,
            },
            apiKey
          );
          analysis.scholarships = scholarshipResult.scholarships;
          logger.info("Scholarships found from transcript", {
            count: scholarshipResult.scholarships.length,
          });
        } catch (scholarshipError) {
          logger.warn("Failed to find scholarships from transcript", {
            error: scholarshipError instanceof Error ? scholarshipError.message : String(scholarshipError),
          });
          // Continue without scholarships
        }
        
        return analysis;
      } catch (parseError) {
        logger.warn("Failed to parse Gemini JSON response for transcript", {
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
      }
    }

    return {};
  } catch (error) {
    logger.error("Failed to process transcript PDF", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Process resume PDF to extract student information
 */
export async function processResumePDF(
  resumePDF: ArrayBuffer,
  apiKey: string
): Promise<ResumeAnalysis> {
  try {
    logger.info("Processing resume PDF with Gemini", {
      resumeSize: resumePDF.byteLength,
    });

    const resumeBase64 = arrayBufferToBase64(resumePDF);

    const prompt = `You are analyzing a student resume PDF. Extract the following information and return it as JSON:

{
  "name": "Student's full name",
  "email": "Email address if available",
  "phone": "Phone number if available",
  "workExperience": "Summary of work experience, internships, and relevant employment",
  "achievements": "List of achievements, awards, honors, or recognitions",
  "skills": ["array", "of", "technical", "skills"],
  "education": [
    {
      "degree": "Degree name",
      "institution": "Institution name",
      "year": "Graduation year or expected year"
    }
  ],
  "certifications": ["array", "of", "certifications"],
  "extracurricularActivities": "Summary of clubs, organizations, volunteer work, or other activities"
}

Extract all available information from the resume. If a field is not available, use null or omit it.`;

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
                    data: resumeBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Gemini API error for resume processing", new Error(errorText));
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const aiText = data.candidates[0]?.content.parts[0]?.text;

    if (!aiText) {
      logger.warn("Gemini API returned empty response for resume");
      return {};
    }

    // Try to extract JSON from the response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const analysis = JSON.parse(jsonMatch[0]) as ResumeAnalysis;
        logger.info("Successfully extracted resume information", {
          hasName: !!analysis.name,
          hasWorkExperience: !!analysis.workExperience,
          hasAchievements: !!analysis.achievements,
        });
        
        // Find relevant scholarships based on extracted information
        try {
          const scholarshipResult = await findRelevantScholarships(
            {
              achievements: analysis.achievements,
              workExperience: analysis.workExperience,
              extracurricularActivities: analysis.extracurricularActivities,
              institution: analysis.education?.[0]?.institution,
            },
            apiKey
          );
          analysis.scholarships = scholarshipResult.scholarships;
          logger.info("Scholarships found from resume", {
            count: scholarshipResult.scholarships.length,
          });
        } catch (scholarshipError) {
          logger.warn("Failed to find scholarships from resume", {
            error: scholarshipError instanceof Error ? scholarshipError.message : String(scholarshipError),
          });
          // Continue without scholarships
        }
        
        return analysis;
      } catch (parseError) {
        logger.warn("Failed to parse Gemini JSON response for resume", {
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
      }
    }

    return {};
  } catch (error) {
    logger.error("Failed to process resume PDF", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Find relevant scholarships using Gemini AI based on student information
 */
export async function findRelevantScholarships(
  studentInfo: {
    program?: string;
    gpa?: number;
    raceEthnicity?: string;
    isFirstGeneration?: boolean;
    isVeteran?: boolean;
    isInternationalStudent?: boolean;
    classStanding?: string;
    institution?: string;
    achievements?: string;
    workExperience?: string;
    extracurricularActivities?: string;
    careerGoals?: string;
    financialNeed?: string;
  },
  apiKey: string
): Promise<{ scholarships: Scholarship[] }> {
  try {
    logger.info("Finding relevant scholarships with Gemini", {
      hasProgram: !!studentInfo.program,
      hasGPA: !!studentInfo.gpa,
    });

    const studentProfile = JSON.stringify(studentInfo, null, 2);

    const prompt = `You are a scholarship matching expert. Based on the following student profile, recommend 5-10 relevant scholarships that match their qualifications, background, and goals.

Student Profile:
${studentProfile}

For each scholarship, provide the following information in JSON format:

{
  "scholarships": [
    {
      "id": "unique-id-like-scholarship-name-kebab-case",
      "title": "Full scholarship name",
      "awardUSD": number (award amount in US dollars),
      "deadlineISO": "YYYY-MM-DD" (deadline date in ISO format, use a realistic future date),
      "programTags": ["array", "of", "relevant", "program", "tags", "like", "Computer Science", "Engineering", "STEM", etc.],
      "essayWords": number (optional, word count requirement if any),
      "url": "https://example.com/scholarship-url" (optional, application URL if known),
      "blurb": "Brief description of the scholarship, eligibility requirements, and why it's a good match for this student"
    }
  ]
}

Important guidelines:
1. Only recommend real, legitimate scholarships that exist
2. Match scholarships based on: program/major, GPA requirements, demographic eligibility (race, first-gen, veteran, international), class standing, achievements, and career goals
3. Include a mix of scholarships: some with high award amounts, some with specific eligibility criteria the student meets
4. Make sure deadlines are realistic future dates
5. Include program tags that are relevant to the student's field of study
6. Write compelling blurbs that explain why each scholarship is a good match
7. If the student is first-generation, include first-generation specific scholarships
8. If the student is a veteran, include veteran-specific scholarships
9. If the student is international, include scholarships open to international students
10. Consider the student's achievements and extracurricular activities when matching

Return ONLY valid JSON, no additional text.`;

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
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Gemini API error for scholarship finding", new Error(errorText));
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const aiText = data.candidates[0]?.content.parts[0]?.text;

    if (!aiText) {
      logger.warn("Gemini API returned empty response for scholarship finding");
      return { scholarships: [] };
    }

    // Try to extract JSON from the response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]) as { scholarships: Scholarship[] };
        logger.info("Successfully found scholarships", {
          count: result.scholarships?.length || 0,
        });
        return { scholarships: result.scholarships || [] };
      } catch (parseError) {
        logger.warn("Failed to parse Gemini JSON response for scholarships", {
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
      }
    }

    return { scholarships: [] };
  } catch (error) {
    logger.error("Failed to find relevant scholarships", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

