/**
 * Proposal Generation Service
 * Uses Gemini AI to generate scholarship proposals based on scholarship info and optional supporting documents
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

interface ProposalRequest {
  scholarship: {
    id: string;
    title: string;
    blurb: string;
    awardUSD: number;
    deadlineISO: string;
    programTags: string[];
    essayWords?: number;
    url?: string;
  };
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
  };
  supportingDocument?: {
    name: string;
    data: string; // Base64 encoded PDF
  };
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
 * Generate a scholarship proposal using Gemini AI
 */
export async function generateProposal(
  request: ProposalRequest,
  apiKey: string
): Promise<string> {
  const startTime = Date.now();
  
  logger.info("Generating proposal with Gemini", {
    scholarshipId: request.scholarship.id,
    scholarshipTitle: request.scholarship.title,
    hasSupportingDocument: !!request.supportingDocument,
  });

  // Build the prompt
  const defaultTemplate = `
# Proposal Structure Template

## RFP (Request for Proposal) Information
- Goals: [Scholarship goals and objectives]
- Requirements: [Requirements to reach those goals]
- Budget: [Budget allocation and financial details]

## Goals
[Clear statement of academic and career goals]

## Requirements to Reach Goals
[Specific requirements, milestones, and steps needed]

## Things Already Done
[Accomplishments, achievements, and progress made so far]

## Budget Allocation
[Detailed budget breakdown]

## Impact Statement
[How the scholarship will impact the student's journey]

## Timeline
[Short-term, medium-term, and long-term plans]
`;

  let prompt = `You are an AI assistant helping a student generate a professional scholarship proposal.

**Scholarship Information:**
- Title: ${request.scholarship.title}
- Description: ${request.scholarship.blurb}
- Award Amount: $${request.scholarship.awardUSD.toLocaleString()}
- Deadline: ${new Date(request.scholarship.deadlineISO).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
- Program Focus: ${request.scholarship.programTags.join(", ")}
${request.scholarship.essayWords ? `- Essay Word Limit: ${request.scholarship.essayWords} words` : ""}

**Student Information:**
- Name: ${request.studentInfo.name}
- Program: ${request.studentInfo.program}
${request.studentInfo.gpa ? `- GPA: ${request.studentInfo.gpa}` : ""}
${request.studentInfo.classStanding ? `- Class Standing: ${request.studentInfo.classStanding}` : ""}
${request.studentInfo.achievements ? `- Achievements: ${request.studentInfo.achievements}` : ""}
${request.studentInfo.workExperience ? `- Work Experience: ${request.studentInfo.workExperience}` : ""}
${request.studentInfo.extracurricularActivities ? `- Extracurricular Activities: ${request.studentInfo.extracurricularActivities}` : ""}
${request.studentInfo.careerGoals ? `- Career Goals: ${request.studentInfo.careerGoals}` : ""}
${request.studentInfo.financialNeed ? `- Financial Need: ${request.studentInfo.financialNeed}` : ""}
${request.studentInfo.isFirstGeneration ? `- First-generation college student` : ""}
${request.studentInfo.isVeteran ? `- Veteran` : ""}
${request.studentInfo.isInternationalStudent ? `- International student` : ""}
${request.studentInfo.raceEthnicity ? `- Race/Ethnicity: ${request.studentInfo.raceEthnicity}` : ""}
${request.studentInfo.additionalNotes ? `\n**Additional Notes:**\n${request.studentInfo.additionalNotes}` : ""}

`;

  if (request.supportingDocument) {
    prompt += `\n**Supporting Document Provided:** ${request.supportingDocument.name}\n`;
    prompt += `Please analyze the supporting document and use its structure and format as a template for the proposal. `;
    prompt += `If the document specifies a particular proposal format, structure, or requirements, follow those exactly. `;
    prompt += `Extract any relevant information from the document to enhance the proposal.\n\n`;
  } else {
    prompt += `\n**No supporting document provided. Use the following default template structure:**\n\n${defaultTemplate}\n\n`;
  }

  prompt += `**Instructions:**
1. Create a professional, compelling scholarship proposal
2. ${request.supportingDocument ? "Follow the structure and format specified in the supporting document" : "Use the default template structure provided above"}
3. Make the proposal specific to the scholarship and student information provided
4. Ensure the proposal is well-written, persuasive, and professional
5. Include specific details about the student's background, goals, and how the scholarship will help
6. ${request.scholarship.essayWords ? `Keep the proposal within approximately ${request.scholarship.essayWords} words` : "Make the proposal comprehensive but concise"}
7. Format the output as clean markdown

Generate the proposal now:`;

  try {
    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      { text: prompt },
    ];

    // Add supporting document if provided
    if (request.supportingDocument) {
      parts.push({
        inline_data: {
          mime_type: "application/pdf",
          data: request.supportingDocument.data,
        },
      });
    }

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
              parts,
            },
          ],
        }),
      }
    );

    const duration = Date.now() - startTime;
    logger.performance("proposal_generation", duration, {
      scholarshipId: request.scholarship.id,
      hasSupportingDocument: !!request.supportingDocument,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Gemini API error for proposal generation", new Error(errorText), {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const proposalText = data.candidates[0]?.content.parts[0]?.text;

    if (!proposalText) {
      logger.warn("Gemini API returned empty proposal", {
        scholarshipId: request.scholarship.id,
      });
      throw new Error("Gemini API returned empty proposal");
    }

    logger.info("Proposal generated successfully", {
      scholarshipId: request.scholarship.id,
      proposalLength: proposalText.length,
      duration,
    });

    return proposalText;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Failed to generate proposal", error instanceof Error ? error : new Error(String(error)), {
      scholarshipId: request.scholarship.id,
      duration,
    });
    throw error;
  }
}

