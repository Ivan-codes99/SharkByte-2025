/**
 * MDC Program Scraper Script
 * 
 * This script scrapes MDC program pages to build a mapping of:
 * - Career Prospects → MDC Programs
 * - Program URLs → PDF Links
 * 
 * Run this script once to generate the mapping data.
 * 
 * Usage (from backend directory):
 *   npm run scrape
 * 
 * This will scrape all MDC program pages and generate:
 *   src/data/career-program-mapping-data.ts
 * 
 * Note: This script should be run in a Node.js environment (not Cloudflare Workers)
 * as it uses Node.js-specific APIs for web scraping.
 */

// Note: These Node.js imports may show TypeScript errors in the IDE
// because the main tsconfig is set up for Cloudflare Workers.
// However, this script runs in Node.js via tsx, so these will work at runtime.
// @ts-ignore - Node.js types available at runtime
import { writeFileSync, readFileSync } from "fs";
// @ts-ignore
import { join, dirname } from "path";
// @ts-ignore
import { fileURLToPath } from "url";
import type { CareerProgramMapping, MDCProgram } from "../data/career-program-mapping";

// @ts-ignore - import.meta.url is available in Node.js ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Base URL for MDC program pages
 */
const BASE_URL = "https://www.mdc.edu";

/**
 * Program links configuration file path
 */
const PROGRAM_LINKS_FILE = join(__dirname, "../data/mdc-program-links.json");

/**
 * Load program links from JSON file
 */
interface ProgramLinksConfig {
  bachelors?: string[];
  associateArts?: string[];
  associateScience?: string[];
  certificates?: {
    collegeCredit?: string[];
    advancedTechnical?: string[];
    careerTechnical?: string[];
    professionalPreparation?: string[];
  };
}

function loadProgramLinks(): ProgramLinksConfig {
  try {
    const fileContent = readFileSync(PROGRAM_LINKS_FILE, "utf-8");
    const config = JSON.parse(fileContent) as ProgramLinksConfig;
    console.log("✓ Loaded program links from JSON file");
    return config;
  } catch (error) {
    console.error("❌ Failed to load program links from JSON file:", error instanceof Error ? error.message : String(error));
    console.error(`  Expected file at: ${PROGRAM_LINKS_FILE}`);
    console.error("  Please create the JSON file with program links.");
    // @ts-ignore - process is available in Node.js
    process.exit(1);
  }
}

/**
 * Scrape a single program page to extract:
 * - Program name
 * - Career prospects (from main page or /careers.aspx subpage)
 * 
 * Note: PDFs are NOT extracted during scraping. They will be fetched later
 * when a user selects a program, using the programUrl stored in the mapping.
 */
async function scrapeProgramPage(programUrl: string, index?: number, total?: number): Promise<{
  name: string;
  careerProspects: string[];
  pdfLinks: { courseList?: string; sequenceGuide?: string };
  careersUrl?: string;
}> {
  const progress = index !== undefined && total !== undefined ? `[${index + 1}/${total}]` : "";
  console.log(`  ${progress} Fetching: ${programUrl}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(programUrl);
    const fetchTime = Date.now() - startTime;
    
    if (!response.ok) {
      console.error(`  ${progress} ❌ Failed to fetch: HTTP ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch ${programUrl}: ${response.statusText}`);
    }
    
    console.log(`  ${progress} ✓ Fetched in ${fetchTime}ms`);
    const html = await response.text();
    
    // Extract program name - try multiple strategies
    let name = "Unknown Program";
    
    // Helper function to check if a name is generic/invalid
    const isGenericName = (text: string): boolean => {
      const lower = text.toLowerCase();
      return lower.includes("academics") ||
             lower.includes("academic programs") ||
             lower === "programs" ||
             lower.includes("miami dade college") ||
             lower.includes("mdc") ||
             lower.includes("new world school of the arts") || // Common wrong extraction
             text.length < 3 ||
             text.length > 150;
    };
    
    // Strategy 1: Look for program name in specific heading patterns
    // MDC pages often have the program name in an h1 or h2 after "Academics" navigation
    const programHeadingPatterns = [
      /<h1[^>]*>([^<]+(?:Associate|Bachelor|Certificate|Degree|Program)[^<]*)<\/h1>/i,
      /<h2[^>]*>([^<]+(?:Associate|Bachelor|Certificate|Degree|Program)[^<]*)<\/h2>/i,
      /<h1[^>]*>([^<]+)<\/h1>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/i, // Get second heading if first is generic
    ];
    
    for (const pattern of programHeadingPatterns) {
      const match = html.match(pattern);
      if (match) {
        // Use the first capture group, or second if available
        const candidate = match[2] || match[1];
        const cleaned = candidate.replace(/<[^>]+>/g, "").trim();
        // Skip generic terms
        if (cleaned && !isGenericName(cleaned)) {
          name = cleaned;
          break;
        }
      }
    }
    
    // Strategy 2: Look for breadcrumbs or navigation that might contain program name
    if (isGenericName(name) || name === "Unknown Program") {
      // Look for breadcrumb patterns like: Home > Academics > Program Name
      const breadcrumbMatch = html.match(/<[^>]*breadcrumb[^>]*>[\s\S]*?([A-Z][^<]{10,80}(?:Associate|Bachelor|Certificate|Degree|Science|Arts)[^<]{0,50})/i) ||
                                      html.match(/>\s*([A-Z][^<]{10,80}(?:Associate|Bachelor|Certificate|Degree|Science|Arts)[^<]{0,50})\s*</i);
      if (breadcrumbMatch) {
        const candidate = breadcrumbMatch[1].trim();
        if (candidate && !isGenericName(candidate)) {
          name = candidate;
        }
      }
    }
    
    // Strategy 3: Extract from page title, but filter out generic terms
    if (isGenericName(name) || name === "Unknown Program") {
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch) {
        let title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
        // Remove common prefixes/suffixes
        title = title.replace(/^\s*(?:Miami Dade College|MDC)\s*[-|]\s*/i, "");
        title = title.replace(/\s*[-|]\s*(?:Academics|Academic Programs|Miami Dade College|MDC)\s*$/i, "");
        title = title.replace(/\s*\|\s*.*$/i, ""); // Remove everything after |
        if (title && !isGenericName(title)) {
          name = title.trim();
        }
      }
    }
    
    // Strategy 4: Extract from URL path as fallback
    if (isGenericName(name) || name === "Unknown Program") {
      try {
        const urlObj = new URL(programUrl);
        const pathSegments = urlObj.pathname.split("/").filter(s => s.length > 0 && s !== "careers.aspx" && s !== "default.aspx");
        if (pathSegments.length > 0) {
          const lastSegment = pathSegments[pathSegments.length - 1];
          // Convert URL slug to readable name (e.g., "accountingmanagement" -> "Accounting Management")
          // Handle compound words by splitting on common patterns
          let readable = lastSegment
            .replace(/\.aspx$/, "")
            .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space before capitals
            .replace(/([a-z])([0-9])/g, "$1 $2") // Add space before numbers
            .replace(/_/g, " ")
            .replace(/-/g, " ");
          
          // Split compound words (e.g., "accountingmanagement" -> "accounting management")
          // Common patterns: management, administration, technology, engineering, etc.
          readable = readable
            .replace(/([a-z])(management|administration|technology|engineering|science|studies|education|design|development|analytics|marketing|programming|systems|networking|security|analysis|planning|services|operations|innovation|production)/gi, "$1 $2")
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
          
          if (readable.length > 3 && !isGenericName(readable)) {
            name = readable;
          }
        }
      } catch (e) {
        // URL parsing failed, keep current name
      }
    }
    
    // Strategy 5: Look for any meaningful heading that's not generic
    if (isGenericName(name) || name === "Unknown Program") {
      // Look for any h1-h3 that's not generic
      const anyHeadingMatch = html.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi);
      if (anyHeadingMatch) {
        for (const heading of anyHeadingMatch) {
          const text = heading.replace(/<[^>]+>/g, "").trim();
          if (text && !isGenericName(text) && text.length > 5 && text.length < 100) {
            name = text;
            break;
          }
        }
      }
    }
    
    // Final fallback: Use URL-based name if we still have a generic name
    if (isGenericName(name) || name === "Unknown Program") {
      try {
        const urlObj = new URL(programUrl);
        const pathSegments = urlObj.pathname.split("/").filter(s => s.length > 0 && s !== "careers.aspx" && s !== "default.aspx");
        if (pathSegments.length > 0) {
          const lastSegment = pathSegments[pathSegments.length - 1];
          // Use same improved logic as Strategy 4
          let readable = lastSegment
            .replace(/\.aspx$/, "")
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/([a-z])([0-9])/g, "$1 $2")
            .replace(/_/g, " ")
            .replace(/-/g, " ");
          
          // Split compound words
          readable = readable
            .replace(/([a-z])(management|administration|technology|engineering|science|studies|education|design|development|analytics|marketing|programming|systems|networking|security|analysis|planning|services|operations|innovation|production)/gi, "$1 $2")
            .replace(/\b\w/g, l => l.toUpperCase());
          
          if (readable.length > 3) {
            name = readable;
          }
        }
      } catch (e) {
        // Keep current name
      }
    }
    
    console.log(`  ${progress} Program: ${name}`);
    
    // Skip PDF extraction - we'll fetch PDFs later when user selects a program
    const pdfLinks: { courseList?: string; sequenceGuide?: string } = {};
    
    // Check for careers subpage link
    let careersUrl: string | undefined;
    // Look for links to careers.aspx (can be relative or absolute)
    const careersLinkMatch = html.match(/<a[^>]*href=["']([^"']*\/careers\.aspx)["'][^>]*>/i) ||
                             html.match(/href=["']([^"']*careers\.aspx[^"']*)["']/i);
    
    if (careersLinkMatch) {
      let careersPath = careersLinkMatch[1];
      // Construct full URL if relative
      if (!careersPath.startsWith("http")) {
        if (careersPath.startsWith("/")) {
          careersUrl = `${BASE_URL}${careersPath}`;
        } else {
          // Relative path - construct from program URL
          const urlObj = new URL(programUrl);
          const basePath = urlObj.pathname.replace(/\/$/, "");
          careersUrl = `${urlObj.origin}${basePath}/${careersPath}`;
        }
      } else {
        careersUrl = careersPath;
      }
      console.log(`  ${progress} ℹ️  Found careers subpage: ${careersUrl}`);
    }
    
    // Also try constructing careers URL from program URL pattern
    if (!careersUrl) {
      const urlObj = new URL(programUrl);
      const basePath = urlObj.pathname.replace(/\/$/, "");
      const potentialCareersUrl = `${urlObj.origin}${basePath}/careers.aspx`;
      // We'll try fetching it later if main page has no careers
      careersUrl = potentialCareersUrl;
    }
    
    // Extract career prospects from the main page first
    let careerProspects: string[] = [];
    
    // Try multiple patterns to find career prospects on main page
    // Based on MDC's structure: careers are in styled boxes/divs after "Career Prospects" heading
    const careerSectionPatterns = [
      // Pattern 1: Look for "Career Prospects" heading followed by content (more flexible)
      /<h[1-6][^>]*>Career Prospects?<\/h[1-6]>[\s\S]*?(?:<p[^>]*>.*?<\/p>)?([\s\S]*?)(?=<h[1-6]|<\/section>|<\/div[^>]*class|$)/i,
      // Pattern 2: Look for "Career Information" section
      /Career Information[^<]*>([\s\S]*?)(?:<\/section>|<\/div>|<h[1-6]|$)/i,
      // Pattern 3: Look for "Job roles related" text
      /Job roles? related[^<]*>([\s\S]*?)(?:<\/section>|<\/div>|<\/div>|$)/i,
      // Pattern 4: Generic "Career Prospects" section (broader match)
      /Career Prospects?[^<]*>([\s\S]*?)(?:<\/section>|<\/div>|<h[1-6]|$)/i,
    ];
    
    for (let patternIdx = 0; patternIdx < careerSectionPatterns.length; patternIdx++) {
      const pattern = careerSectionPatterns[patternIdx];
      const careerSectionMatch = html.match(pattern);
      if (careerSectionMatch) {
        const careerText = careerSectionMatch[1];
        
        // Debug: Log a sample of the matched section (first 500 chars) to help diagnose issues
        if (patternIdx === 0) { // Only log for first pattern to avoid spam
          const sample = careerText.substring(0, 500).replace(/\s+/g, " ");
          console.log(`  ${progress} 🔍 Found Career Prospects section (sample): ${sample}...`);
        }
        
        // Extract careers from styled boxes/divs (MDC uses styled divs with classes)
        // Try multiple patterns to match the box-like structure, including nested content
        const jobMatches = 
          // Pattern 1: Divs with nested content (capture all text inside, including nested elements)
          (() => {
            const divMatches: string[] = [];
            const divRegex = /<div[^>]*class=["'][^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
            let divMatch;
            while ((divMatch = divRegex.exec(careerText)) !== null) {
              // Extract all text from nested HTML
              const innerText = divMatch[1].replace(/<[^>]+>/g, "").trim();
              if (innerText.length > 0) {
                divMatches.push(innerText);
              }
            }
            return divMatches.length > 0 ? divMatches : null;
          })() ||
          // Pattern 2: List items (including nested content)
          (() => {
            const liMatches: string[] = [];
            const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
            let liMatch;
            while ((liMatch = liRegex.exec(careerText)) !== null) {
              const innerText = liMatch[1].replace(/<[^>]+>/g, "").trim();
              if (innerText.length > 0) {
                liMatches.push(innerText);
              }
            }
            return liMatches.length > 0 ? liMatches : null;
          })() ||
          // Pattern 3: Paragraphs with career titles (including nested content)
          (() => {
            const pMatches: string[] = [];
            const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
            let pMatch;
            while ((pMatch = pRegex.exec(careerText)) !== null) {
              const innerText = pMatch[1].replace(/<[^>]+>/g, "").trim();
              if (innerText.length > 0) {
                pMatches.push(innerText);
              }
            }
            return pMatches.length > 0 ? pMatches : null;
          })() ||
          // Pattern 4: Any div containing text (fallback, including nested)
          (() => {
            const divMatches: string[] = [];
            const divRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
            let divMatch;
            while ((divMatch = divRegex.exec(careerText)) !== null) {
              const innerText = divMatch[1].replace(/<[^>]+>/g, "").trim();
              if (innerText.length > 0 && innerText.length < 200) { // Limit length to avoid capturing entire sections
                divMatches.push(innerText);
              }
            }
            return divMatches.length > 0 ? divMatches : null;
          })() ||
          // Pattern 5: Plain text with bullet points
          careerText.match(/(?:^|\n)\s*[-•·]\s*([^\n]+)/gi);
        
        if (jobMatches && Array.isArray(jobMatches) && jobMatches.length > 0) {
          careerProspects = jobMatches
            .map((match: string | RegExpMatchArray) => {
              // If match is already a string (from nested extraction), use it directly
              // Otherwise, remove HTML tags and clean up
              let text: string;
              if (typeof match === 'string') {
                text = match;
              } else if (Array.isArray(match)) {
                // RegExp match array - get the captured group
                text = (match.length > 1 ? match[1] : match[0]) || String(match[0]);
              } else {
                text = String(match);
              }
              text = text.replace(/<[^>]+>/g, "").trim();
              // Remove common prefixes like "•", "-", etc.
              text = text.replace(/^[-•·]\s*/, "").trim();
              // Remove extra whitespace and newlines
              text = text.replace(/[\s\n\r]+/g, " ").trim();
              return text;
            })
            .filter(text => {
              // Filter out empty, too short, or too long entries
              // Also filter out common non-job text, accessibility links, and navigation
              const lowerText = text.toLowerCase();
              return text.length > 3 && 
                     text.length < 100 && 
                     !lowerText.includes("loading") &&
                     !lowerText.includes("interested in") &&
                     !lowerText.includes("learn more") &&
                     !lowerText.includes("south florida") &&
                     !lowerText.includes("employment picture") &&
                     !lowerText.includes("explore career") &&
                     !lowerText.includes("pursue additional") &&
                     !lowerText.includes("pursue additional studies") &&
                     !lowerText.startsWith("job roles") &&
                     !lowerText.startsWith("career prospects") &&
                     !lowerText.match(/^when you/i) && // "when you pursue additional studies"
                     !lowerText.match(/^explore/i) && // "explore career options"
                     !lowerText.startsWith("skip to") && // Accessibility skip links
                     !lowerText.includes("skip to site") &&
                     !lowerText.includes("skip to content") &&
                     !lowerText.includes("skip navigation") &&
                     !lowerText.includes("go to main") &&
                     !lowerText.includes("go to content") &&
                     !lowerText.match(/^menu$/i) && // Menu items
                     !lowerText.match(/^home$/i) && // Navigation items
                     !lowerText.match(/^search$/i) &&
                     !lowerText.match(/^close$/i) &&
                     !lowerText.match(/^back$/i);
            });
          
          if (careerProspects.length > 0) {
            console.log(`  ${progress} ✓ Found ${careerProspects.length} career prospects on main page`);
            break;
          } else if (patternIdx === 0) {
            // Debug: If we matched the section but found no careers, log what we tried
            console.log(`  ${progress} ⚠️  Matched Career Prospects section but extracted 0 careers. Trying other patterns...`);
          }
        } else if (patternIdx === 0) {
          // Debug: If we matched the section but found no job matches
          console.log(`  ${progress} ⚠️  Matched Career Prospects section but found no job matches in HTML structure.`);
        }
      }
    }
    
    // If no careers found on main page, try the careers subpage
    if (careerProspects.length === 0 && careersUrl) {
      console.log(`  ${progress} No careers on main page, checking careers subpage: ${careersUrl}`);
      try {
        const careersStartTime = Date.now();
        const careersResponse = await fetch(careersUrl);
        const careersFetchTime = Date.now() - careersStartTime;
        
        if (careersResponse.ok) {
          console.log(`  ${progress} ✓ Fetched careers page in ${careersFetchTime}ms`);
          const careersHtml = await careersResponse.text();
          
          // Try multiple patterns to extract careers from careers page
          // Careers page uses same structure as main page - styled boxes/divs
          const careersPatterns = [
            // Pattern 1: "Career Prospects" heading followed by content
            /<h[1-6][^>]*>Career Prospects?<\/h[1-6]>[\s\S]*?(?:<p[^>]*>.*?<\/p>)?([\s\S]*?)(?:<h[1-6]|<\/section>|<\/div>|$)/i,
            // Pattern 2: "Job roles related" section
            /Job roles? related[^<]*>([\s\S]*?)(?:<\/section>|<\/div>|$)/i,
            // Pattern 3: Generic "Career Prospects" section
            /Career Prospects?[^<]*>([\s\S]*?)(?:<\/section>|<\/div>|$)/i,
            // Pattern 4: Unordered list (fallback)
            /<ul[^>]*>([\s\S]*?)<\/ul>/i,
          ];
          
          for (const pattern of careersPatterns) {
            const careersListMatch = careersHtml.match(pattern);
            if (careersListMatch) {
              const careersContent = careersListMatch[1];
              
              // Extract from styled boxes/divs (same improved logic as main page)
              const jobMatches = 
                // Pattern 1: Divs with nested content
                (() => {
                  const divMatches: string[] = [];
                  const divRegex = /<div[^>]*class=["'][^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
                  let divMatch;
                  while ((divMatch = divRegex.exec(careersContent)) !== null) {
                    const innerText = divMatch[1].replace(/<[^>]+>/g, "").trim();
                    if (innerText.length > 0) {
                      divMatches.push(innerText);
                    }
                  }
                  return divMatches.length > 0 ? divMatches : null;
                })() ||
                // Pattern 2: List items (including nested)
                (() => {
                  const liMatches: string[] = [];
                  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
                  let liMatch;
                  while ((liMatch = liRegex.exec(careersContent)) !== null) {
                    const innerText = liMatch[1].replace(/<[^>]+>/g, "").trim();
                    if (innerText.length > 0) {
                      liMatches.push(innerText);
                    }
                  }
                  return liMatches.length > 0 ? liMatches : null;
                })() ||
                // Pattern 3: Paragraphs (including nested)
                (() => {
                  const pMatches: string[] = [];
                  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
                  let pMatch;
                  while ((pMatch = pRegex.exec(careersContent)) !== null) {
                    const innerText = pMatch[1].replace(/<[^>]+>/g, "").trim();
                    if (innerText.length > 0) {
                      pMatches.push(innerText);
                    }
                  }
                  return pMatches.length > 0 ? pMatches : null;
                })() ||
                // Pattern 4: Any div (fallback)
                (() => {
                  const divMatches: string[] = [];
                  const divRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
                  let divMatch;
                  while ((divMatch = divRegex.exec(careersContent)) !== null) {
                    const innerText = divMatch[1].replace(/<[^>]+>/g, "").trim();
                    if (innerText.length > 0 && innerText.length < 200) {
                      divMatches.push(innerText);
                    }
                  }
                  return divMatches.length > 0 ? divMatches : null;
                })();
              
              if (jobMatches && Array.isArray(jobMatches) && jobMatches.length > 0) {
                careerProspects = jobMatches
                  .map((match: string | RegExpMatchArray) => {
                    let text: string;
                    if (typeof match === 'string') {
                      text = match;
                    } else if (Array.isArray(match)) {
                      text = (match.length > 1 ? match[1] : match[0]) || String(match[0]);
                    } else {
                      text = String(match);
                    }
                    text = text.replace(/<[^>]+>/g, "").trim();
                    text = text.replace(/^[-•·]\s*/, "").trim();
                    text = text.replace(/[\s\n\r]+/g, " ").trim();
                    return text;
                  })
                  .filter(text => {
                    const lowerText = text.toLowerCase();
                    return text.length > 3 && 
                           text.length < 100 && 
                           !lowerText.includes("loading") &&
                           !lowerText.includes("interested in") &&
                           !lowerText.includes("learn more") &&
                           !lowerText.includes("south florida") &&
                           !lowerText.includes("employment picture") &&
                           !lowerText.includes("explore career") &&
                           !lowerText.includes("pursue additional") &&
                           !lowerText.includes("pursue additional studies") &&
                           !lowerText.startsWith("job roles") &&
                           !lowerText.startsWith("career prospects") &&
                           !lowerText.match(/^when you/i) &&
                           !lowerText.match(/^explore/i) &&
                           !lowerText.startsWith("skip to") && // Accessibility skip links
                           !lowerText.includes("skip to site") &&
                           !lowerText.includes("skip to content") &&
                           !lowerText.includes("skip navigation") &&
                           !lowerText.includes("go to main") &&
                           !lowerText.includes("go to content") &&
                           !lowerText.match(/^menu$/i) &&
                           !lowerText.match(/^home$/i) &&
                           !lowerText.match(/^search$/i) &&
                           !lowerText.match(/^close$/i) &&
                           !lowerText.match(/^back$/i);
                  });
                
                if (careerProspects.length > 0) {
                  console.log(`  ${progress} ✓ Found ${careerProspects.length} career prospects on careers page`);
                  break;
                }
              }
            }
          }
        } else {
          console.warn(`  ${progress} ⚠️  Careers page returned HTTP ${careersResponse.status}`);
          // If careers page doesn't exist, don't store the URL
          if (careersResponse.status === 404) {
            careersUrl = undefined;
          }
        }
      } catch (err) {
        console.warn(`  ${progress} ⚠️  Failed to scrape careers page ${careersUrl}:`, err instanceof Error ? err.message : String(err));
        // If fetch failed, don't store invalid URL
        careersUrl = undefined;
      }
    }
    
    // If no career prospects found, use the program name itself as a fallback
    if (careerProspects.length === 0) {
      console.warn(`  ${progress} ⚠️  No career prospects found for this program`);
      // Use program name as a career prospect so the program can still be found
      if (name && name !== "Unknown Program" && !name.toLowerCase().includes("academics")) {
        careerProspects = [name];
        console.log(`  ${progress} ℹ️  Using program name "${name}" as career prospect`);
      }
    } else {
      console.log(`  ${progress} Career prospects: ${careerProspects.slice(0, 3).join(", ")}${careerProspects.length > 3 ? ` (+${careerProspects.length - 3} more)` : ""}`);
    }
    
    return {
      name,
      careerProspects,
      pdfLinks, // Empty - PDFs will be fetched later
      careersUrl, // Store careersUrl if it exists (even if no careers found - might be dynamically loaded)
    };
  } catch (error) {
    console.error(`  ${progress} ❌ Error scraping ${programUrl}:`, error instanceof Error ? error.message : String(error));
    return {
      name: "Unknown Program",
      careerProspects: [],
      pdfLinks: {},
    };
  }
}

/**
 * Extract program links from a listing page (DEPRECATED - now using JSON file)
 * Kept for reference but not used in main flow
 */
async function extractProgramLinks(listingUrl: string, tabSelector?: string): Promise<string[]> {
  console.log(`  Extracting program links from: ${listingUrl}`);
  try {
    const startTime = Date.now();
    const response = await fetch(listingUrl);
    const fetchTime = Date.now() - startTime;
    
    if (!response.ok) {
      console.error(`  ❌ Failed to fetch listing page: HTTP ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch ${listingUrl}: ${response.statusText}`);
    }
    
    console.log(`  ✓ Fetched listing page in ${fetchTime}ms`);
    const html = await response.text();
    const programLinks: string[] = [];
    
    // Debug: Log page title to verify we got the right page
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      console.log(`  Page title: ${titleMatch[1].trim()}`);
    }
    
    // Debug: Count total links found (before filtering)
    const allLinksMatch = html.match(/<a[^>]*href=["']([^"']+)["']/gi);
    const totalLinks = allLinksMatch ? allLinksMatch.length : 0;
    console.log(`  Total links on page: ${totalLinks}`);
    
    // Debug: Sample some links to see what format they use
    if (allLinksMatch) {
      const sampleLinks: string[] = [];
      for (let i = 0; i < Math.min(20, allLinksMatch.length); i++) {
        const linkMatch = allLinksMatch[i].match(/href=["']([^"']+)["']/i);
        if (linkMatch && linkMatch[1]) {
          const link = linkMatch[1];
          // Only show links that might be program-related
          if (link.includes('program') || link.includes('academic') || link.includes('.aspx')) {
            sampleLinks.push(link);
          }
        }
      }
      if (sampleLinks.length > 0) {
        console.log(`  Sample links found (first ${Math.min(10, sampleLinks.length)}):`);
        sampleLinks.slice(0, 10).forEach((link, idx) => {
          console.log(`    ${idx + 1}. ${link}`);
        });
      }
    }
    
    // Pages/paths to exclude (these are listing/navigation pages, not program pages)
    const excludedProgramNames = [
      'about',
      'academics',
      'admissions',
      'enroll',
      'feedback',
      'contact',
      'campuses',
      'business',
      'community',
      'portals',
      'life-at-mdc',
      'paying-for-college',
      'default',
      'bachelors',
      'associate',
      'certificate',
      'overview',
      'compare',
      'academic-schools',
      'calendar',
      'apply',
      'register',
      'search',
      'give',
      'news',
    ];
    
    // URL patterns to exclude (navigation, about pages, etc.)
    const excludedUrlPatterns = [
      '/about/',
      '/enroll/',
      '/feedback/',
      '/contact',
      '/campuses',
      '/business',
      '/community',
      '/admissions/',
      '/paying-for-college/',
      '/life-at-mdc/',
      '/portals/',
      '/apply',
      '/register',
      '/search',
      '/give',
      '/news',
    ];
    
    // Look for links to program pages
    // MDC program pages use format: https://www.mdc.edu/[program-name]/ or https://www.mdc.edu/[program-name]
    // Examples: /bsn/, /leadershipandmanagementinnovation/, /ethnicstudies
    const patterns = [
      // Direct program links: /program-name/ or /program-name
      /<a[^>]*href=["']([^"']*\/[a-z][a-z0-9-]+\/?)["']/gi,
      // Full URLs to mdc.edu programs (excluding common paths)
      /<a[^>]*href=["'](https?:\/\/[^"']*mdc\.edu\/([a-z][a-z0-9-]+\/?))["']/gi,
      // Relative paths that look like program names
      /href=["'](\/([a-z][a-z0-9-]{5,}\/?))["']/gi,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let url = match[1];
        
        // Normalize the URL
        if (!url.startsWith("http")) {
          if (url.startsWith("/")) {
            url = `${BASE_URL}${url}`;
          } else {
            url = `${BASE_URL}/${url}`;
          }
        }
        
        try {
          // Extract just the filename to check if it should be excluded
          const urlPath = new URL(url).pathname;
          const filename = urlPath.split("/").pop()?.toLowerCase() || "";
          
          // Check if URL matches excluded patterns
          const isExcluded = excludedProgramNames.includes(filename.toLowerCase()) ||
            excludedUrlPatterns.some(pattern => url.includes(pattern));
          
          // MDC program URLs are direct: mdc.edu/programname/ (not in /academics/programs/)
          // Extract path segments to check structure
          const urlObj = new URL(url);
          const pathSegments = urlObj.pathname.split("/").filter(s => s.length > 0);
          const programName = pathSegments[pathSegments.length - 1] || "";
          
          // Program URLs should be:
          // - Direct under root: /programname/ or /programname
          // - Not in subdirectories like /academics/programs/
          // - Have a valid program name (lowercase, numbers, hyphens, 3+ chars)
          // - Not in the excluded list
          const isExcludedName = excludedProgramNames.includes(programName.toLowerCase());
          const isDirectProgramPath = pathSegments.length <= 2 && // Just domain/program or domain/program/
            programName.length >= 3 &&
            /^[a-z0-9-]+$/.test(programName) &&
            !isExcludedName &&
            !isExcluded &&
            !programLinks.includes(url);
          
          if (isDirectProgramPath) {
            programLinks.push(url);
            console.log(`  ✓ Found program link: ${url}`);
          }
        } catch (urlError) {
          // Invalid URL, skip it
        }
      }
    }
    
    // Look for program links in specific content sections
    // MDC program links are in format: /program-name/ or /program-name
    const contentSelectors = [
      // Main content area
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      // Content divs
      /<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      // Program lists (often in ul/li structures)
      /<ul[^>]*class=["'][^"']*program[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi,
    ];
    
    // Try to find program-specific sections
    for (const selector of contentSelectors) {
      let selectorMatch;
      while ((selectorMatch = selector.exec(html)) !== null) {
        const sectionHtml = selectorMatch[1];
        
        // Look for program links in the format /program-name/ or /program-name
        const programPatterns = [
          // Links to program pages: /program-name/ or /program-name
          /<a[^>]*href=["'](\/([a-z][a-z0-9-]{5,}\/?))["'][^>]*>([^<]+)<\/a>/gi,
          // Full URLs to mdc.edu programs
          /<a[^>]*href=["'](https?:\/\/[^"']*mdc\.edu\/([a-z][a-z0-9-]{5,}\/?))["'][^>]*>([^<]+)<\/a>/gi,
        ];
        
        for (const pattern of programPatterns) {
          let contentMatch;
          while ((contentMatch = pattern.exec(sectionHtml)) !== null) {
            let url = contentMatch[1];
            const linkText = (contentMatch[3] || contentMatch[2] || "").trim();
            
            // Normalize URL - ensure it's a full URL
            if (!url.startsWith("http")) {
              if (url.startsWith("/")) {
                url = `${BASE_URL}${url}`;
              } else {
                url = `${BASE_URL}/${url}`;
              }
            }
            
            try {
              const urlObj = new URL(url);
              const pathname = urlObj.pathname;
              
              // Extract the program name (last segment of path)
              const pathSegments = pathname.split("/").filter(s => s.length > 0);
              const programName = pathSegments[pathSegments.length - 1] || "";
              
              // Filter: must be a valid program URL
              // Exclude: about, enroll, feedback, contact, campuses, business, community, etc.
              // Must be a direct program path (not in subdirectories like /academics/programs/)
              const isExcludedPath = excludedUrlPatterns.some(pattern => url.includes(pattern)) ||
                excludedProgramNames.includes(programName.toLowerCase());
              
              // Program URLs are typically: mdc.edu/programname/ or mdc.edu/programname
              // They should NOT be in /academics/programs/ subdirectory
              const isDirectProgramPath = pathSegments.length <= 2 && // mdc.edu/program or mdc.edu/program/
                programName.length >= 3 &&
                /^[a-z0-9-]+$/.test(programName) && // Only lowercase, numbers, hyphens
                !isExcludedPath &&
                linkText.length > 5 &&
                !programLinks.includes(url);
              
              if (isDirectProgramPath) {
                programLinks.push(url);
                console.log(`  ✓ Found program link: "${linkText}" -> ${url}`);
              }
            } catch (urlError) {
              // Invalid URL, skip
            }
          }
        }
      }
    }
    
    // Also try to find program names in the HTML and see if we can match them to links
    // Look for program names in headings or list items
    const programNamePatterns = [
      /<h[2-4][^>]*>([^<]*(?:Bachelor|Associate|Certificate|Degree|Science|Arts|Nursing)[^<]*)<\/h[2-4]>/gi,
      /<li[^>]*>[\s\S]*?([A-Z][^<]{20,100}(?:Bachelor|Associate|Certificate|Science|Arts|Nursing)[^<]{0,50})[\s\S]*?<\/li>/gi,
    ];
    
    // Log program names found for debugging
    for (const pattern of programNamePatterns) {
      let match;
      let foundCount = 0;
      while ((match = pattern.exec(html)) !== null && foundCount < 5) {
        const programName = match[1].trim().substring(0, 80);
        if (programName.length > 20) {
          console.log(`  ℹ️  Found potential program name: "${programName}"`);
          foundCount++;
        }
      }
    }
    
    // Sort and log all found links for debugging
    programLinks.sort();
    console.log(`  ✓ Extracted ${programLinks.length} unique program links`);
    if (programLinks.length > 0 && programLinks.length <= 20) {
      console.log(`  Sample links:`);
      programLinks.slice(0, 5).forEach((link, idx) => {
        console.log(`    ${idx + 1}. ${link}`);
      });
      if (programLinks.length > 5) {
        console.log(`    ... and ${programLinks.length - 5} more`);
      }
    }
    
    return programLinks;
  } catch (error) {
    console.error(`  ❌ Error extracting links from ${listingUrl}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Main scraping function
 * Now uses program links from JSON file instead of extracting from HTML
 */
async function scrapeAllPrograms(): Promise<CareerProgramMapping[]> {
  const overallStartTime = Date.now();
  console.log("=".repeat(80));
  console.log("Starting MDC Program Scraping");
  console.log("=".repeat(80));
  console.log(`Start time: ${new Date().toISOString()}\n`);
  
  // Load program links from JSON file
  console.log("📋 Loading program links from JSON file...");
  const programLinksConfig = loadProgramLinks();
  
  const allPrograms: MDCProgram[] = [];
  const careerToPrograms = new Map<string, MDCProgram[]>();
  const stats = {
    bachelors: { total: 0, withCareers: 0, errors: 0 },
    associateAA: { total: 0, withCareers: 0, errors: 0 },
    associateAS: { total: 0, withCareers: 0, errors: 0 },
    certificates: { total: 0, withCareers: 0, errors: 0 },
  };
  
  // Scrape Bachelor's programs
  console.log("\n" + "─".repeat(80));
  console.log("📚 SCRAPING BACHELOR'S PROGRAMS");
  console.log("─".repeat(80));
  const bachelorsLinks = programLinksConfig.bachelors || [];
  console.log(`Found ${bachelorsLinks.length} Bachelor's program links in JSON file\n`);
  
  for (let i = 0; i < bachelorsLinks.length; i++) {
    const link = bachelorsLinks[i];
    stats.bachelors.total++;
    
    try {
      const programData = await scrapeProgramPage(link, i, bachelorsLinks.length);
      
      // Extract program ID from URL (e.g., "bsn" from "https://www.mdc.edu/bsn/")
      let programId: string;
      try {
        const urlPath = new URL(link).pathname;
        programId = urlPath.split("/").filter(s => s.length > 0).pop() || `bachelors-${i}`;
      } catch (urlError) {
        console.warn(`  [${i + 1}/${bachelorsLinks.length}] ⚠️  Invalid URL format: ${link}, using fallback ID`);
        programId = `bachelors-${i}`;
      }
    
      const program: MDCProgram = {
        id: programId,
        name: programData.name,
        degreeType: "BS",
        programUrl: link,
        careersUrl: programData.careersUrl,
        pdfLinks: programData.pdfLinks,
        careerProspects: programData.careerProspects,
      };
      
      // Track statistics (PDFs are not extracted during scraping)
      if (programData.careerProspects.length > 0) {
        stats.bachelors.withCareers++;
      }
      if (programData.name === "Unknown Program") {
        stats.bachelors.errors++;
      }
      
      allPrograms.push(program);
      
      // Map careers to programs
      // Each program already has programUrl stored, so it can be used to fetch PDFs later
      programData.careerProspects.forEach(career => {
        if (!careerToPrograms.has(career)) {
          careerToPrograms.set(career, []);
        }
        // Ensure program URL is included (it should already be set above)
        if (program.programUrl) {
          careerToPrograms.get(career)!.push(program);
          console.log(`  ✓ Mapped career "${career}" to program: ${program.name} (${program.programUrl})`);
        } else {
          console.warn(`  ⚠️  Program ${program.name} missing programUrl, skipping career mapping`);
        }
      });
    } catch (error) {
      console.error(`  [${i + 1}/${bachelorsLinks.length}] ❌ Failed to process program: ${link}`);
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      stats.bachelors.errors++;
      // Continue to next program instead of stopping
    }
    
    // Add delay to avoid overwhelming the server (2 seconds between requests)
    if (i < bachelorsLinks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n✓ Completed Bachelor's programs: ${stats.bachelors.total} total, ${stats.bachelors.withCareers} with careers`);
  
  // Scrape Associate in Arts programs
  console.log("\n" + "─".repeat(80));
  console.log("📖 SCRAPING ASSOCIATE IN ARTS PROGRAMS");
  console.log("─".repeat(80));
  const aaLinks = programLinksConfig.associateArts || [];
  console.log(`Found ${aaLinks.length} AA program links in JSON file\n`);
  
  for (let i = 0; i < aaLinks.length; i++) {
    const link = aaLinks[i];
    stats.associateAA.total++;
    
    try {
      const programData = await scrapeProgramPage(link, i, aaLinks.length);
      
      let programId: string;
      try {
        const urlPath = new URL(link).pathname;
        programId = urlPath.split("/").filter(s => s.length > 0).pop() || `aa-${i}`;
      } catch (urlError) {
        console.warn(`  [${i + 1}/${aaLinks.length}] ⚠️  Invalid URL format: ${link}, using fallback ID`);
        programId = `aa-${i}`;
      }
    
      const program: MDCProgram = {
        id: programId,
        name: programData.name,
        degreeType: "AA",
        programUrl: link,
        careersUrl: programData.careersUrl,
        pdfLinks: programData.pdfLinks,
        careerProspects: programData.careerProspects,
      };
      
      // Track statistics (PDFs are not extracted during scraping)
      if (programData.careerProspects.length > 0) {
        stats.associateAA.withCareers++;
      }
      if (programData.name === "Unknown Program") {
        stats.associateAA.errors++;
      }
      
      allPrograms.push(program);
      
      programData.careerProspects.forEach(career => {
        if (!careerToPrograms.has(career)) {
          careerToPrograms.set(career, []);
        }
        if (program.programUrl) {
          careerToPrograms.get(career)!.push(program);
        }
      });
    } catch (error) {
      console.error(`  [${i + 1}/${aaLinks.length}] ❌ Failed to process program: ${link}`);
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      stats.associateAA.errors++;
      // Continue to next program instead of stopping
    }
    
    // Add delay to avoid overwhelming the server (2 seconds between requests)
    if (i < aaLinks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n✓ Completed Associate in Arts programs: ${stats.associateAA.total} total, ${stats.associateAA.withCareers} with careers`);
  
  // Scrape Associate in Science programs
  console.log("\n" + "─".repeat(80));
  console.log("📗 SCRAPING ASSOCIATE IN SCIENCE PROGRAMS");
  console.log("─".repeat(80));
  const asLinks = programLinksConfig.associateScience || [];
  console.log(`Found ${asLinks.length} AS program links in JSON file\n`);
  
  for (let i = 0; i < asLinks.length; i++) {
    const link = asLinks[i];
    stats.associateAS.total++;
    
    try {
      const programData = await scrapeProgramPage(link, i, asLinks.length);
      
      let programId: string;
      try {
        const urlPath = new URL(link).pathname;
        programId = urlPath.split("/").filter(s => s.length > 0).pop() || `as-${i}`;
      } catch (urlError) {
        console.warn(`  [${i + 1}/${asLinks.length}] ⚠️  Invalid URL format: ${link}, using fallback ID`);
        programId = `as-${i}`;
      }
    
      const program: MDCProgram = {
        id: programId,
        name: programData.name,
        degreeType: "AS",
        programUrl: link,
        careersUrl: programData.careersUrl,
        pdfLinks: programData.pdfLinks,
        careerProspects: programData.careerProspects,
      };
      
      // Track statistics (PDFs are not extracted during scraping)
      if (programData.careerProspects.length > 0) {
        stats.associateAS.withCareers++;
      }
      if (programData.name === "Unknown Program") {
        stats.associateAS.errors++;
      }
      
      allPrograms.push(program);
      
      programData.careerProspects.forEach(career => {
        if (!careerToPrograms.has(career)) {
          careerToPrograms.set(career, []);
        }
        if (program.programUrl) {
          careerToPrograms.get(career)!.push(program);
        }
      });
    } catch (error) {
      console.error(`  [${i + 1}/${asLinks.length}] ❌ Failed to process program: ${link}`);
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      stats.associateAS.errors++;
      // Continue to next program instead of stopping
    }
    
    // Add delay to avoid overwhelming the server (2 seconds between requests)
    if (i < asLinks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n✓ Completed Associate in Science programs: ${stats.associateAS.total} total, ${stats.associateAS.withCareers} with careers`);
  
  // Scrape Certificate programs (all categories)
  console.log("\n" + "─".repeat(80));
  console.log("📜 SCRAPING CERTIFICATE PROGRAMS");
  console.log("─".repeat(80));
  const certConfig = programLinksConfig.certificates || {};
  const certLinks = [
    ...(certConfig.collegeCredit || []),
    ...(certConfig.advancedTechnical || []),
    ...(certConfig.careerTechnical || []),
    ...(certConfig.professionalPreparation || []),
  ];
  console.log(`Found ${certLinks.length} Certificate program links in JSON file\n`);
  
  for (let i = 0; i < certLinks.length; i++) {
    const link = certLinks[i];
    stats.certificates.total++;
    
    try {
      const programData = await scrapeProgramPage(link, i, certLinks.length);
      
      let programId: string;
      try {
        const urlPath = new URL(link).pathname;
        programId = urlPath.split("/").filter(s => s.length > 0).pop() || `cert-${i}`;
      } catch (urlError) {
        console.warn(`  [${i + 1}/${certLinks.length}] ⚠️  Invalid URL format: ${link}, using fallback ID`);
        programId = `cert-${i}`;
      }
    
      const program: MDCProgram = {
        id: programId,
        name: programData.name,
        degreeType: "CERT",
        programUrl: link,
        careersUrl: programData.careersUrl,
        pdfLinks: programData.pdfLinks,
        careerProspects: programData.careerProspects,
      };
      
      // Track statistics (PDFs are not extracted during scraping)
      if (programData.careerProspects.length > 0) {
        stats.certificates.withCareers++;
      }
      if (programData.name === "Unknown Program") {
        stats.certificates.errors++;
      }
      
      allPrograms.push(program);
      
      programData.careerProspects.forEach(career => {
        if (!careerToPrograms.has(career)) {
          careerToPrograms.set(career, []);
        }
        if (program.programUrl) {
          careerToPrograms.get(career)!.push(program);
        }
      });
    } catch (error) {
      console.error(`  [${i + 1}/${certLinks.length}] ❌ Failed to process program: ${link}`);
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      stats.certificates.errors++;
      // Continue to next program instead of stopping
    }
    
    // Add delay to avoid overwhelming the server (2 seconds between requests)
    if (i < certLinks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n✓ Completed Certificate programs: ${stats.certificates.total} total, ${stats.certificates.withCareers} with careers`);
  
  // Build the mapping array
  console.log("\n" + "─".repeat(80));
  console.log("🔗 BUILDING CAREER-TO-PROGRAM MAPPING");
  console.log("─".repeat(80));
  const mapping: CareerProgramMapping[] = Array.from(careerToPrograms.entries()).map(([career, programs]) => {
    // Remove duplicate programs (same program can appear for multiple careers)
    const uniquePrograms = new Map<string, MDCProgram>();
    programs.forEach(program => {
      if (!uniquePrograms.has(program.id)) {
        uniquePrograms.set(program.id, program);
      }
    });
    
    const programsList = Array.from(uniquePrograms.values());
    
    // Ensure all programs have programUrl for later PDF fetching
    // Keep careerProspects array - it's useful for:
    // 1. Displaying all careers a program leads to
    // 2. Reverse lookups (finding programs by checking their careerProspects)
    // 3. Fuzzy search functionality
    const programsWithUrls = programsList.map(program => {
      if (!program.programUrl) {
        console.warn(`  ⚠️  Program ${program.name} (${program.id}) is missing programUrl`);
      }
      return program;
    });
    
    console.log(`  Mapped "${career}" to ${programsWithUrls.length} program(s)`);
    programsWithUrls.forEach(program => {
      console.log(`    - ${program.name} (${program.programUrl})`);
    });
    
    return {
      career,
      programs: programsWithUrls,
      // You can manually categorize fields later or use AI to categorize
      field: categorizeField(career, programs),
    };
  });
  
  const overallDuration = Date.now() - overallStartTime;
  const totalPrograms = allPrograms.length;
  const totalCareers = mapping.length;
  const totalWithCareers = stats.bachelors.withCareers + stats.associateAA.withCareers + stats.associateAS.withCareers + stats.certificates.withCareers;
  const totalErrors = stats.bachelors.errors + stats.associateAA.errors + stats.associateAS.errors + stats.certificates.errors;
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ SCRAPING COMPLETE!");
  console.log("=".repeat(80));
  console.log(`End time: ${new Date().toISOString()}`);
  console.log(`Total duration: ${(overallDuration / 1000).toFixed(2)} seconds (${(overallDuration / 60000).toFixed(2)} minutes)\n`);
  
  console.log("📊 SUMMARY STATISTICS:");
  console.log("─".repeat(80));
  console.log(`Total Programs Scraped: ${totalPrograms}`);
  console.log(`  - Bachelor's: ${stats.bachelors.total}`);
  console.log(`  - Associate in Arts: ${stats.associateAA.total}`);
  console.log(`  - Associate in Science: ${stats.associateAS.total}`);
  console.log(`  - Certificates: ${stats.certificates.total}`);
  console.log();
  console.log(`Programs with Career Prospects: ${totalWithCareers} (${((totalWithCareers / totalPrograms) * 100).toFixed(1)}%)`);
  console.log(`Total Unique Careers: ${totalCareers}`);
  console.log(`Errors Encountered: ${totalErrors}`);
  console.log("─".repeat(80));
  console.log(`\nNote: PDFs were not extracted during scraping. They will be fetched`);
  console.log(`      automatically when users select a program, using the programUrl.`);
  
  if (totalErrors > 0) {
    console.warn(`\n⚠️  Warning: ${totalErrors} program(s) had errors during scraping. Review the logs above for details.`);
  }
  
  if (totalWithCareers < totalPrograms * 0.5) {
    console.warn(`\n⚠️  Warning: Only ${((totalWithCareers / totalPrograms) * 100).toFixed(1)}% of programs have career prospects. Manual curation may be needed.`);
  }
  
  return mapping;
}

/**
 * Categorize a career into a field
 * This is a simple heuristic - can be improved with AI or manual curation
 */
function categorizeField(career: string, programs: MDCProgram[]): string {
  const careerLower = career.toLowerCase();
  
  if (careerLower.includes("software") || careerLower.includes("developer") || 
      careerLower.includes("programmer") || careerLower.includes("engineer") && 
      (careerLower.includes("computer") || careerLower.includes("software"))) {
    return "Technology";
  }
  if (careerLower.includes("nurse") || careerLower.includes("medical") || 
      careerLower.includes("health") || careerLower.includes("therapist")) {
    return "Medicine";
  }
  if (careerLower.includes("teacher") || careerLower.includes("educator") || 
      careerLower.includes("education")) {
    return "Education";
  }
  if (careerLower.includes("police") || careerLower.includes("security") || 
      careerLower.includes("criminal") || careerLower.includes("law enforcement")) {
    return "Criminal Justice";
  }
  if (careerLower.includes("business") || careerLower.includes("manager") || 
      careerLower.includes("accountant") || careerLower.includes("marketing")) {
    return "Business";
  }
  
  return "Other";
}

/**
 * Main execution
 */
async function main() {
  try {
    const mapping = await scrapeAllPrograms();
    
    // Write to file
    console.log("\n" + "─".repeat(80));
    console.log("💾 SAVING MAPPING TO FILE");
    console.log("─".repeat(80));
    const outputPath = join(__dirname, "../data/career-program-mapping-data.ts");
    const output = `/**
 * Auto-generated career to program mapping
 * Generated by scrape-mdc-programs.ts
 * Generated on: ${new Date().toISOString()}
 * DO NOT EDIT MANUALLY - Regenerate using the scraper script
 */

import type { CareerProgramMapping } from "./career-program-mapping";

export const careerToProgramsMapping: CareerProgramMapping[] = ${JSON.stringify(mapping, null, 2)};
`;
    
    writeFileSync(outputPath, output, "utf-8");
    const fileSize = (output.length / 1024).toFixed(2);
    console.log(`✓ Mapping saved successfully!`);
    console.log(`  Path: ${outputPath}`);
    console.log(`  Size: ${fileSize} KB`);
    console.log(`  Careers: ${mapping.length}`);
    console.log(`  Total programs: ${mapping.reduce((sum, m) => sum + m.programs.length, 0)}`);
    console.log("\n" + "=".repeat(80));
    console.log("🎉 All done! The mapping is ready to use.");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n" + "=".repeat(80));
    console.error("❌ SCRAPING FAILED");
    console.error("=".repeat(80));
    console.error("Error:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    // @ts-ignore - process is available in Node.js
    process.exit(1);
  }
}

// Run if executed directly
main();

