/**
 * SharkScholar Backend - Cloudflare Workers Entry Point
 * Main API server using Hono framework
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import type { PathwayGenerationRequest, GeneratedPathway, RequirementGroup } from "./types";
import { generatePathway } from "./services/pathway-generator";
import { getCachedPathway, cachePathway } from "./lib/storage";
import { logger } from "./lib/logger";
import { processProgramPDFs } from "./services/pdf-processor";
import {
  getAllCareerProspects,
  getAllFields,
  getProgramsByCareer,
  getProgramsByField,
  searchProgramsByCareer,
  getProgramById,
  getProgramByUrl,
  type MDCProgram,
} from "./data/career-program-mapping";

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
    maxAge: 86400,
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
    service: "SharkScholar Backend",
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

// Process program PDFs endpoint
app.post("/programs/analyze", async (c) => {
  const startTime = Date.now();
  
  try {
    const formData = await c.req.formData();
    const courseListEntry = formData.get("courseList");
    const sequenceGuideEntry = formData.get("sequenceGuide");

    if (!courseListEntry || !sequenceGuideEntry) {
      logger.warn("PDF processing request missing files", {
        hasCourseList: !!courseListEntry,
        hasSequenceGuide: !!sequenceGuideEntry,
      });
      return c.json({ error: "Both courseList and sequenceGuide PDFs are required" }, 400);
    }

    // Validate that entries are Files
    if (typeof courseListEntry === "string" || typeof sequenceGuideEntry === "string") {
      return c.json({ error: "Both entries must be file uploads" }, 400);
    }

    const courseListFile = courseListEntry as File;
    const sequenceGuideFile = sequenceGuideEntry as File;

    // Validate file types
    if (courseListFile.type !== "application/pdf" || sequenceGuideFile.type !== "application/pdf") {
      return c.json({ error: "Both files must be PDF documents" }, 400);
    }

    logger.info("Processing program PDFs", {
      courseListName: courseListFile.name,
      courseListSize: courseListFile.size,
      sequenceGuideName: sequenceGuideFile.name,
      sequenceGuideSize: sequenceGuideFile.size,
    });

    // Convert files to ArrayBuffer
    const courseListBuffer = await courseListFile.arrayBuffer();
    const sequenceGuideBuffer = await sequenceGuideFile.arrayBuffer();

    // Process with Gemini
    const env = c.env;
    if (!env.GEMINI_API_KEY) {
      logger.error("Gemini API key not configured");
      return c.json({ error: "Gemini API key not configured" }, 500);
    }

    const analysis = await processProgramPDFs(
      courseListBuffer,
      sequenceGuideBuffer,
      env.GEMINI_API_KEY
    );

    const duration = Date.now() - startTime;
    
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
    
    logger.performance("pdf_processing", duration, {
      topLevelGroups: analysis.requirements.groups.length,
      totalCourses,
      degreeType: analysis.degreeType,
    });

    logger.info("Program PDFs processed successfully", {
      programName: analysis.programName,
      degreeType: analysis.degreeType,
      topLevelGroups: analysis.requirements.groups.length,
      totalCourses,
    });

    return c.json(analysis);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("PDF processing error", error instanceof Error ? error : new Error(String(error)), {
      endpoint: "/programs/analyze",
      duration,
    });
    
    return c.json(
      {
        error: "Failed to process PDFs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// List available careers/programs
app.get("/careers", (c) => {
  logger.info("Listing available careers");
  const careers = getAllCareerProspects();
  return c.json({ careers });
});

// Get programs by career
app.get("/programs/by-career/:career", (c) => {
  try {
    const career = decodeURIComponent(c.req.param("career"));
    logger.info(`Fetching programs for career: ${career}`);
    
    const programs = getProgramsByCareer(career);
    logger.info(`Found ${programs.length} programs for career: ${career}`);
    
    return c.json({ career, programs });
  } catch (error) {
    logger.error("Error fetching programs by career", error instanceof Error ? error : new Error(String(error)), {
      endpoint: "/programs/by-career/:career",
      career: c.req.param("career"),
    });
    return c.json({ error: "Failed to fetch programs" }, 500);
  }
});

// Search programs by career (fuzzy search)
app.get("/programs/search", (c) => {
  try {
    const searchTerm = c.req.query("q") || "";
    logger.info(`Searching programs for: ${searchTerm}`);
    
    if (!searchTerm) {
      return c.json({ error: "Search term (q) is required" }, 400);
    }
    
    const programs = searchProgramsByCareer(searchTerm);
    logger.info(`Found ${programs.length} programs matching: ${searchTerm}`);
    
    return c.json({ searchTerm, programs });
  } catch (error) {
    logger.error("Error searching programs", error instanceof Error ? error : new Error(String(error)), {
      endpoint: "/programs/search",
      searchTerm: c.req.query("q"),
    });
    return c.json({ error: "Failed to search programs" }, 500);
  }
});

// Get programs by field
app.get("/programs/by-field/:field", (c) => {
  try {
    const field = decodeURIComponent(c.req.param("field"));
    logger.info(`Fetching programs for field: ${field}`);
    
    const mappings = getProgramsByField(field);
    logger.info(`Found ${mappings.length} career mappings for field: ${field}`);
    
    return c.json({ field, mappings });
  } catch (error) {
    logger.error("Error fetching programs by field", error instanceof Error ? error : new Error(String(error)), {
      endpoint: "/programs/by-field/:field",
      field: c.req.param("field"),
    });
    return c.json({ error: "Failed to fetch programs" }, 500);
  }
});

// Get all fields
app.get("/fields", (c) => {
  logger.info("Listing available fields");
  const fields = getAllFields();
  return c.json({ fields });
});

// Download PDF from MDC program page
app.get("/programs/:programId/pdf", async (c) => {
  try {
    const programId = decodeURIComponent(c.req.param("programId"));
    const pdfType = c.req.query("type") as "courseList" | "sequenceGuide" | undefined;
    
    logger.info(`Fetching PDF for program: ${programId}, type: ${pdfType}`);
    
    // Get program from mapping using helper function
    const targetProgram = getProgramById(programId);
    
    if (!targetProgram) {
      logger.warn(`Program not found: ${programId}`);
      return c.json({ error: "Program not found" }, 404);
    }
    
    logger.info(`Found program: ${targetProgram.name} (${targetProgram.programUrl})`);
    
    // Determine which PDF to fetch
    const pdfUrl = pdfType === "courseList" 
      ? targetProgram.pdfLinks.courseList
      : pdfType === "sequenceGuide"
      ? targetProgram.pdfLinks.sequenceGuide
      : targetProgram.pdfLinks.courseList || targetProgram.pdfLinks.sequenceGuide;
    
    if (!pdfUrl) {
      logger.warn(`PDF not found for program: ${programId}, type: ${pdfType}`);
      return c.json({ error: "PDF not available for this program" }, 404);
    }
    
    // Fetch PDF from MDC
    logger.info(`Fetching PDF from: ${pdfUrl}`);
    const pdfResponse = await fetch(pdfUrl);
    
    if (!pdfResponse.ok) {
      logger.warn(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      return c.json({ error: "Failed to fetch PDF from MDC" }, pdfResponse.status as any);
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const contentType = pdfResponse.headers.get("content-type") || "application/pdf";
    
    logger.info(`PDF fetched successfully: ${pdfUrl}, size: ${pdfBuffer.byteLength} bytes`);
    
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${programId}-${pdfType || "course-list"}.pdf"`,
      },
    });
  } catch (error) {
    logger.error("Error fetching PDF", error instanceof Error ? error : new Error(String(error)), {
      endpoint: "/programs/:programId/pdf",
      programId: c.req.param("programId"),
    });
    return c.json({ error: "Failed to fetch PDF" }, 500);
  }
});

// Analyze program by fetching PDFs automatically
app.post("/programs/:programId/analyze", async (c) => {
  const startTime = Date.now();
  const programId = decodeURIComponent(c.req.param("programId"));
  
  try {
    logger.info(`Analyzing program: ${programId}`);
    
    // Get program from mapping using helper function
    const targetProgram = getProgramById(programId);
    
    if (!targetProgram) {
      logger.warn(`Program not found: ${programId}`);
      return c.json({ error: "Program not found" }, 404);
    }
    
    logger.info(`Found program: ${targetProgram.name} (${targetProgram.programUrl})`);
    
    // Fetch both PDFs
    // First try using stored PDF links, but if not available, re-scrape the program page
    const pdfs: { courseList?: ArrayBuffer; sequenceGuide?: ArrayBuffer } = {};
    
    // If PDF links are already stored, use them
    if (targetProgram.pdfLinks.courseList) {
      logger.info(`Fetching course list PDF from stored link: ${targetProgram.pdfLinks.courseList}`);
      const courseListResponse = await fetch(targetProgram.pdfLinks.courseList);
      if (courseListResponse.ok) {
        pdfs.courseList = await courseListResponse.arrayBuffer();
        logger.info(`✓ Course list PDF fetched successfully`);
      } else {
        logger.warn(`Failed to fetch stored course list PDF: ${courseListResponse.status}`);
      }
    }
    
    if (targetProgram.pdfLinks.sequenceGuide) {
      logger.info(`Fetching sequence guide PDF from stored link: ${targetProgram.pdfLinks.sequenceGuide}`);
      const sequenceGuideResponse = await fetch(targetProgram.pdfLinks.sequenceGuide);
      if (sequenceGuideResponse.ok) {
        pdfs.sequenceGuide = await sequenceGuideResponse.arrayBuffer();
        logger.info(`✓ Sequence guide PDF fetched successfully`);
      } else {
        logger.warn(`Failed to fetch stored sequence guide PDF: ${sequenceGuideResponse.status}`);
      }
    }
    
    // If PDFs weren't found in stored links, try re-scraping the program page
    if ((!pdfs.courseList || !pdfs.sequenceGuide) && targetProgram.programUrl) {
      logger.info(`Some PDFs missing, re-scraping program page: ${targetProgram.programUrl}`);
      try {
        const programPageResponse = await fetch(targetProgram.programUrl);
        if (programPageResponse.ok) {
          const html = await programPageResponse.text();
          
          // Extract PDF links from the page
          if (!pdfs.courseList) {
            const courseListMatch = html.match(/See a complete course list[^<]*<a[^>]*href=["']([^"']+)["']/i);
            if (courseListMatch) {
              let pdfUrl = courseListMatch[1];
              if (!pdfUrl.startsWith("http")) {
                pdfUrl = pdfUrl.startsWith("/") ? `https://www.mdc.edu${pdfUrl}` : `https://www.mdc.edu/${pdfUrl}`;
              }
              logger.info(`Found course list PDF on re-scrape: ${pdfUrl}`);
              const courseListResponse = await fetch(pdfUrl);
              if (courseListResponse.ok) {
                pdfs.courseList = await courseListResponse.arrayBuffer();
                logger.info(`✓ Course list PDF fetched from re-scrape`);
              }
            }
          }
          
          if (!pdfs.sequenceGuide) {
            const sequenceGuideMatch = html.match(/See a course sequence guide[^<]*<a[^>]*href=["']([^"']+)["']/i);
            if (sequenceGuideMatch) {
              let pdfUrl = sequenceGuideMatch[1];
              if (!pdfUrl.startsWith("http")) {
                pdfUrl = pdfUrl.startsWith("/") ? `https://www.mdc.edu${pdfUrl}` : `https://www.mdc.edu/${pdfUrl}`;
              }
              logger.info(`Found sequence guide PDF on re-scrape: ${pdfUrl}`);
              const sequenceGuideResponse = await fetch(pdfUrl);
              if (sequenceGuideResponse.ok) {
                pdfs.sequenceGuide = await sequenceGuideResponse.arrayBuffer();
                logger.info(`✓ Sequence guide PDF fetched from re-scrape`);
              }
            }
          }
        }
      } catch (scrapeError) {
        logger.warn(`Failed to re-scrape program page: ${scrapeError instanceof Error ? scrapeError.message : String(scrapeError)}`);
      }
    }
    
    if (!pdfs.courseList && !pdfs.sequenceGuide) {
      logger.error(`No PDFs available for program: ${programId} (programUrl: ${targetProgram.programUrl})`);
      return c.json({ 
        error: "No PDFs available for this program",
        programUrl: targetProgram.programUrl,
        message: "PDFs were not found on the program page. You may need to check the program page manually."
      }, 404);
    }
    
    // Process with Gemini
    const env = c.env;
    if (!env.GEMINI_API_KEY) {
      logger.error("Gemini API key not configured");
      return c.json({ error: "Gemini API key not configured" }, 500);
    }
    
    if (!pdfs.courseList || !pdfs.sequenceGuide) {
      return c.json({ error: "Both course list and sequence guide PDFs are required" }, 400);
    }
    
    const analysis = await processProgramPDFs(
      pdfs.courseList,
      pdfs.sequenceGuide,
      env.GEMINI_API_KEY
    );
    
    const duration = Date.now() - startTime;
    
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
    
    logger.performance("program_auto_analysis", duration, {
      programId,
      topLevelGroups: analysis.requirements.groups.length,
      totalCourses,
      degreeType: analysis.degreeType,
    });
    
    logger.info("Program analyzed successfully", {
      programId,
      programName: analysis.programName,
      degreeType: analysis.degreeType,
    });
    
    return c.json(analysis);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Program analysis error", error instanceof Error ? error : new Error(String(error)), {
      endpoint: "/programs/:programId/analyze",
      programId,
      duration,
    });
    
    return c.json(
      {
        error: "Failed to analyze program",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default app;

