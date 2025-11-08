/**
 * PathFundAI Backend - Cloudflare Workers Entry Point
 * Main API server using Hono framework
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import type { PathwayGenerationRequest, GeneratedPathway } from "./types";
import { generatePathway } from "./services/pathway-generator";
import { getCachedPathway, cachePathway } from "./lib/storage";
import { logger } from "./lib/logger";

type Env = {
  GEMINI_API_KEY?: string;
  PROGRAM_CACHE?: KVNamespace;
  DB?: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", honoLogger());
app.use(
  "*",
  cors({
    origin: "*", // In production, restrict to your frontend domain
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

// Request logging middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  
  logger.info(`Request: ${method} ${path}`, {
    method,
    path,
    url: c.req.url,
  });

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.api(method, path, status, duration, {
    userAgent: c.req.header("user-agent"),
  });
});

// Health check
app.get("/", (c) => {
  logger.info("Health check requested");
  return c.json({
    service: "PathFundAI Backend",
    version: "1.0.0",
    status: "healthy",
  });
});

// Generate pathway endpoint
app.post("/pathways/generate", async (c) => {
  const startTime = Date.now();
  let career = "unknown";
  
  try {
    const request = (await c.req.json()) as PathwayGenerationRequest;
    career = request.career || "unknown";
    
    logger.pathway("generate", request.career, {
      targetInstitutions: request.targetInstitutions,
      includeGraduate: request.includeGraduate,
      includeCertifications: request.includeCertifications,
    });

    // Validate request
    if (!request.career || request.career.trim().length === 0) {
      logger.warn("Pathway generation request missing career field", { request });
      return c.json({ error: "Career field is required" }, 400);
    }

    // Check cache first
    const env = c.env;
    const cached = await getCachedPathway<GeneratedPathway>(request.career, env);
    if (cached) {
      logger.pathway("cache_hit", request.career);
      const duration = Date.now() - startTime;
      logger.performance("pathway_generation", duration, { cached: true });
      
      return c.json({
        ...cached,
        metadata: {
          ...cached.metadata,
          cached: true,
        },
      });
    }

    logger.pathway("cache_miss", request.career);

    // Generate pathway
    const pathway = await generatePathway(request, env.GEMINI_API_KEY);

    // Cache the result
    await cachePathway(request.career, pathway, env);

    const duration = Date.now() - startTime;
    logger.performance("pathway_generation", duration, {
      levels: pathway.primaryPathway.length,
      alternatives: pathway.alternativePathways.length,
      aiEnhanced: pathway.metadata.aiEnhanced,
    });

    logger.info(`Pathway generated successfully for: ${request.career}`, {
      totalDuration: pathway.totalDuration,
      levels: pathway.primaryPathway.map((l) => `${l.level}@${l.institution}`),
    });

    return c.json(pathway);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.pathway("error", career, {
      duration,
    });
    logger.error("Pathway generation error", error instanceof Error ? error : new Error(String(error)), {
      endpoint: "/pathways/generate",
      career,
    });
    
    return c.json(
      {
        error: "Failed to generate pathway",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get pathway by career (cached)
app.get("/pathways/:career", async (c) => {
  try {
    const career = decodeURIComponent(c.req.param("career"));
    logger.info(`Fetching pathway for: ${career}`);
    
    const env = c.env;
    const cached = await getCachedPathway<GeneratedPathway>(career, env);
    
    if (cached) {
      logger.pathway("cache_hit", career);
      return c.json(cached);
    }

    logger.pathway("cache_miss", career);
    return c.json({ error: "Pathway not found. Generate it first using POST /pathways/generate" }, 404);
  } catch (error) {
    logger.error("Error fetching pathway", error instanceof Error ? error : new Error(String(error)), {
      endpoint: "/pathways/:career",
      career: c.req.param("career"),
    });
    return c.json({ error: "Failed to fetch pathway" }, 500);
  }
});

// List available careers/programs
app.get("/careers", (c) => {
  logger.info("Listing available careers");
  return c.json({
    careers: [
      // Computer Science & Technology
      "Computer Scientist",
      "Software Engineer",
      "Computer Engineer",
      "Data Scientist",
      "Cybersecurity Specialist",
      "Information Technology Specialist",
      "Network Administrator",
      "Web Developer",
      "Mobile App Developer",
      "Database Administrator",
      "Cloud Architect",
      "DevOps Engineer",
      // Engineering
      "Mechanical Engineer",
      "Electrical Engineer",
      "Civil Engineer",
      "Aerospace Engineer",
      "Biomedical Engineer",
      "Chemical Engineer",
      "Industrial Engineer",
      "Environmental Engineer",
      // Architecture & Design
      "Architect",
      "Interior Designer",
      "Urban Planner",
      "Landscape Architect",
      // Business & Finance
      "Business Administrator",
      "Accountant",
      "Financial Analyst",
      "Marketing Manager",
      "Human Resources Manager",
      "Project Manager",
      // Healthcare
      "Registered Nurse",
      "Physical Therapist",
      "Occupational Therapist",
      "Radiologic Technologist",
      "Medical Laboratory Technician",
      "Respiratory Therapist",
      // Education
      "Teacher",
      "School Counselor",
      "Educational Administrator",
      // Criminal Justice
      "Police Officer",
      "Probation Officer",
      "Criminal Justice Administrator",
      // Arts & Media
      "Graphic Designer",
      "Multimedia Specialist",
      "Journalist",
      "Public Relations Specialist",
    ],
  });
});

export default app;

