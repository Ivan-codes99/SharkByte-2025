/**
 * Professional Certifications Data
 * Industry certifications relevant to career pathways
 */

import type { Certification } from "../types";
import { logger } from "../lib/logger";

/**
 * Certifications by career field
 */
export const certificationsByCareer: Record<string, Certification[]> = {
  "computer scientist": [
    {
      name: "AWS Solutions Architect",
      description: "Cloud architecture and best practices certification",
      required: false,
      timing: "After BS degree or during MS",
      prerequisites: ["Cloud computing knowledge"],
    },
    {
      name: "Google Cloud Professional",
      description: "Advanced cloud architecture and deployment",
      required: false,
      timing: "After BS degree",
    },
    {
      name: "CompTIA Security+",
      description: "Cybersecurity certification covering network security",
      required: false,
      timing: "During or after BS degree",
    },
    {
      name: "Cisco CCNA",
      description: "Cisco Certified Network Associate",
      required: false,
      timing: "During or after BS degree",
    },
  ],
  "mechanical engineer": [
    {
      name: "FE Exam",
      description: "Fundamentals of Engineering exam",
      required: true,
      timing: "Before graduation or shortly after",
    },
    {
      name: "PE Exam",
      description: "Principles and Practice of Engineering exam",
      required: true,
      timing: "After 4 years of professional experience",
      prerequisites: ["FE Exam"],
    },
  ],
};

/**
 * Get certifications for a career
 */
export async function getCertificationsForCareer(career: string): Promise<Certification[]> {
  logger.data("certifications", "fetch", { career });
  const normalizedCareer = career.toLowerCase();
  const certifications = certificationsByCareer[normalizedCareer] || [];
  
  logger.debug("Certifications found for career", { career, count: certifications.length });
  return certifications;
}

