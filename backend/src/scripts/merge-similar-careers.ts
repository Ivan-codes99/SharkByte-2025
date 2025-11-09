/**
 * Script to merge similar/related career titles so they share the same program mappings
 * For example: "Software Engineer" and "Software Developer" should map to the same programs
 * 
 * Run with: npm run merge-careers
 */

// @ts-ignore - Node.js types available at runtime
import { readFileSync, writeFileSync } from "fs";
// @ts-ignore
import { join, dirname } from "path";
// @ts-ignore
import { fileURLToPath } from "url";

// @ts-ignore - import.meta.url is available in Node.js ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_FILE = join(__dirname, "../data/career-program-mapping-data.ts");

/**
 * Define groups of similar/related career titles that should share programs
 * The first career in each group is the "primary" one - others will get its programs added
 */
const similarCareerGroups: string[][] = [
  // Software development roles - these should all map to the same programs
  ["Software Developer", "Software Engineer", "Computer Programmer", "Application Developer"],
  // Data roles
  ["Data Analyst", "Data Scientist", "Business Intelligence Analyst"],
  // Network/IT roles
  ["Network Administrator", "Network Specialist", "Computer Network Architect"],
  // Database roles
  ["Database Administrator", "Database Manager", "Database Architect"],
  // Security roles
  ["Cybersecurity Specialist", "Information Security Analyst", "Security Analyst", "Cybersecurity Analyst"],
];

/**
 * Normalize career name for comparison
 */
function normalizeCareer(career: string): string {
  return career.toLowerCase().trim();
}

async function mergeSimilarCareers() {
  console.log("=".repeat(80));
  console.log("Merging Similar Career Titles");
  console.log("=".repeat(80));
  console.log();

  // Read the data file
  let fileContent = readFileSync(DATA_FILE, "utf-8");

  // Dynamically import the data to work with it
  const dataModule = await import("../data/career-program-mapping-data.js");
  const mapping = dataModule.careerToProgramsMapping;

  let mergeCount = 0;
  const merges: string[] = [];

  // First, find programs by name/keywords that relate to careers in our groups
  // For example, programs with "Software Engineering" in the name should be included for "Software Engineer"
  const keywordBasedPrograms = new Map<string, Set<string>>(); // career -> program ids
  
  similarCareerGroups.forEach(group => {
    group.forEach(career => {
      const normalized = normalizeCareer(career);
      // Create more specific keyword patterns for each career
      const careerKeywords: string[] = [];
      
      if (normalized.includes("software engineer")) {
        // Only match "software engineering" specifically, not just "engineering"
        careerKeywords.push("softwareengineering", "software engineering");
        // Exclude other types of engineering
      } else if (normalized.includes("software developer")) {
        careerKeywords.push("software", "developer", "programming", "softwareengineering", "software engineering");
      } else if (normalized.includes("data analyst") || normalized.includes("data scientist")) {
        careerKeywords.push("dataanalytics", "data analytics", "data science");
      } else if (normalized.includes("network")) {
        careerKeywords.push("network", "networking", "information systems");
      } else if (normalized.includes("database")) {
        careerKeywords.push("database", "information systems");
      } else if (normalized.includes("cybersecurity") || normalized.includes("security")) {
        careerKeywords.push("cybersecurity", "cyber security", "security");
      } else {
        // Fallback: use all words longer than 4 characters
        careerKeywords.push(...normalized.split(/\s+/).filter(k => k.length > 4));
      }
      
      mapping.forEach(entry => {
        entry.programs.forEach(program => {
          const programNameLower = program.name.toLowerCase();
          const programIdLower = program.id.toLowerCase();
          
          // Check if program name or ID contains specific keywords
          if (careerKeywords.some(keyword => 
            programNameLower.includes(keyword) || programIdLower.includes(keyword)
          )) {
            if (!keywordBasedPrograms.has(normalized)) {
              keywordBasedPrograms.set(normalized, new Set());
            }
            keywordBasedPrograms.get(normalized)!.add(program.id);
          }
        });
      });
    });
  });

  // Find programs that have similar career names in their careerProspects
  // and create career entries for them if they don't exist
  const prospectBasedCareers = new Map<string, Set<string>>(); // career name -> program ids
  
  mapping.forEach(entry => {
    entry.programs.forEach(program => {
      program.careerProspects.forEach(prospect => {
        // Check if this prospect matches any career in our similar groups
        for (const group of similarCareerGroups) {
          if (group.some(c => normalizeCareer(c) === normalizeCareer(prospect))) {
            const normalized = normalizeCareer(prospect);
            if (!prospectBasedCareers.has(normalized)) {
              prospectBasedCareers.set(normalized, new Set());
            }
            prospectBasedCareers.get(normalized)!.add(program.id);
          }
        }
      });
    });
  });

  // Create missing career entries from careerProspects and keyword matches
  const allCareerNames = new Set<string>();
  
  // Collect career names from prospect-based matches
  prospectBasedCareers.forEach((programIds, careerName) => {
    allCareerNames.add(careerName);
  });
  
  // Also add careers from keyword matches that don't have entries
  keywordBasedPrograms.forEach((programIds, careerName) => {
    allCareerNames.add(careerName);
  });
  
  allCareerNames.forEach(careerName => {
    const existingEntry = mapping.find(m => normalizeCareer(m.career) === normalizeCareer(careerName));
    if (!existingEntry) {
      // Find the actual career name (with proper casing) from the groups
      let properName = careerName;
      for (const group of similarCareerGroups) {
        const found = group.find(c => normalizeCareer(c) === normalizeCareer(careerName));
        if (found) {
          properName = found;
          break;
        }
      }
      
      // Get the programs from both sources
      const programIds = new Set<string>();
      const prospectIds = prospectBasedCareers.get(careerName);
      const keywordIds = keywordBasedPrograms.get(careerName);
      
      if (prospectIds) prospectIds.forEach(id => programIds.add(id));
      if (keywordIds) keywordIds.forEach(id => programIds.add(id));
      
      const programs: any[] = [];
      programIds.forEach(id => {
        mapping.forEach(entry => {
          const program = entry.programs.find(p => p.id === id);
          if (program && !programs.find(p => p.id === id)) {
            programs.push(program);
          }
        });
      });
      
      if (programs.length > 0) {
        // Add new career entry
        mapping.push({
          career: properName,
          programs: programs,
          field: "Technology" // Default field, can be improved
        });
        merges.push(`Created new career entry: "${properName}" with ${programs.length} program(s)`);
      }
    }
  });
  
  similarCareerGroups.forEach(group => {
    group.forEach(career => {
      const normalized = normalizeCareer(career);
      const keywords = normalized.split(/\s+/);
      
      mapping.forEach(entry => {
        entry.programs.forEach(program => {
          const programNameLower = program.name.toLowerCase();
          const programIdLower = program.id.toLowerCase();
          
          // Check if program name or ID contains keywords from the career
          if (keywords.some(keyword => 
            keyword.length > 3 && 
            (programNameLower.includes(keyword) || programIdLower.includes(keyword))
          )) {
            if (!keywordBasedPrograms.has(normalized)) {
              keywordBasedPrograms.set(normalized, new Set());
            }
            keywordBasedPrograms.get(normalized)!.add(program.id);
          }
        });
      });
    });
  });

  // For each group of similar careers, merge their program mappings
  for (const group of similarCareerGroups) {
    // Collect all unique programs from all careers in this group
    const allPrograms = new Map<string, any>(); // program id -> program object
    
    // First pass: collect all programs from all careers in the group
    group.forEach(career => {
      const normalized = normalizeCareer(career);
      const mappingEntry = mapping.find(m => normalizeCareer(m.career) === normalized);
      if (mappingEntry) {
        mappingEntry.programs.forEach(program => {
          allPrograms.set(program.id, program);
        });
      }
      
      // Also add programs found by keywords
      const keywordPrograms = keywordBasedPrograms.get(normalized);
      if (keywordPrograms) {
        keywordPrograms.forEach(programId => {
          // Find the program object
          mapping.forEach(entry => {
            const program = entry.programs.find(p => p.id === programId);
            if (program) {
              allPrograms.set(program.id, program);
            }
          });
        });
      }
    });

    // Second pass: update each career in the group to include all programs
    // But filter out programs that are clearly unrelated
    group.forEach(career => {
      const normalized = normalizeCareer(career);
      const mappingEntry = mapping.find(m => normalizeCareer(m.career) === normalized);
      
      if (mappingEntry) {
        const beforeCount = mappingEntry.programs.length;
        
        // Add all programs from the group (will deduplicate by id)
        const programMap = new Map<string, any>();
        
        // First, filter existing programs to remove unrelated ones
        mappingEntry.programs.forEach(p => {
          const programNameLower = p.name.toLowerCase();
          const programIdLower = p.id.toLowerCase();
          
          // For software-related careers, filter out non-software engineering programs
          if (normalized.includes("software")) {
            const isSoftwareRelated = 
              programNameLower.includes("software") || 
              programIdLower.includes("software") ||
              programNameLower.includes("programming") ||
              programIdLower.includes("programming") ||
              programNameLower.includes("computer information") ||
              programIdLower.includes("computerinformation") ||
              programNameLower.includes("developer") ||
              programIdLower.includes("developer") ||
              programNameLower.includes("computer programming") ||
              programIdLower.includes("computerprogramming");
            
            // Exclude if it's engineering but NOT software engineering
            const isNonSoftwareEngineering = 
              (programNameLower.includes("engineering") || programIdLower.includes("engineering")) &&
              !programNameLower.includes("software") &&
              !programIdLower.includes("software");
            
            if (isSoftwareRelated && !isNonSoftwareEngineering) {
              programMap.set(p.id, p);
            }
          } else {
            // For other careers, keep all existing programs
            programMap.set(p.id, p);
          }
        });
        
        // Then add programs from other careers in the group (with same filtering)
        allPrograms.forEach((p, id) => {
          if (!programMap.has(id)) {
            const programNameLower = p.name.toLowerCase();
            const programIdLower = p.id.toLowerCase();
            
            // For software-related careers, filter out non-software engineering programs
            if (normalized.includes("software")) {
              const isSoftwareRelated = 
                programNameLower.includes("software") || 
                programIdLower.includes("software") ||
                programNameLower.includes("programming") ||
                programIdLower.includes("programming") ||
                programNameLower.includes("computer information") ||
                programIdLower.includes("computerinformation") ||
                programNameLower.includes("developer") ||
                programIdLower.includes("developer") ||
                programNameLower.includes("computer programming") ||
                programIdLower.includes("computerprogramming");
              
              // Exclude if it's engineering but NOT software engineering
              const isNonSoftwareEngineering = 
                (programNameLower.includes("engineering") || programIdLower.includes("engineering")) &&
                !programNameLower.includes("software") &&
                !programIdLower.includes("software");
              
              if (isSoftwareRelated && !isNonSoftwareEngineering) {
                programMap.set(id, p);
              }
            } else {
              // For other careers, include all
              programMap.set(id, p);
            }
          }
        });
        
        mappingEntry.programs = Array.from(programMap.values());
        
        const afterCount = mappingEntry.programs.length;
        
        if (afterCount > beforeCount) {
          const added = afterCount - beforeCount;
          mergeCount++;
          const otherCareers = group.filter(c => normalizeCareer(c) !== normalized);
          merges.push(`"${career}": Added ${added} program(s) from similar careers (${otherCareers.join(", ")})`);
        } else if (beforeCount > afterCount) {
          const removed = beforeCount - afterCount;
          mergeCount++;
          merges.push(`"${career}": Removed ${removed} unrelated program(s)`);
        }
      }
    });
  }

  // Rebuild the file content
  const arrayStart = fileContent.indexOf("export const careerToProgramsMapping: CareerProgramMapping[] = [");
  const arrayEnd = fileContent.lastIndexOf("];");
  
  if (arrayStart === -1 || arrayEnd === -1) {
    console.error("❌ Could not find mapping array in data file");
    return;
  }

  const beforeArray = fileContent.substring(0, arrayStart);
  const afterArray = fileContent.substring(arrayEnd + 2);

  // Format the mapping as TypeScript (pretty-printed)
  let newArrayContent = "export const careerToProgramsMapping: CareerProgramMapping[] = [\n";
  mapping.forEach((entry, idx) => {
    newArrayContent += "  {\n";
    newArrayContent += `    "career": ${JSON.stringify(entry.career)},\n`;
    newArrayContent += `    "programs": [\n`;
    entry.programs.forEach((program, pIdx) => {
      newArrayContent += "      {\n";
      newArrayContent += `        "id": ${JSON.stringify(program.id)},\n`;
      newArrayContent += `        "name": ${JSON.stringify(program.name)},\n`;
      newArrayContent += `        "degreeType": ${JSON.stringify(program.degreeType)},\n`;
      newArrayContent += `        "programUrl": ${JSON.stringify(program.programUrl)},\n`;
      if (program.careersUrl) {
        newArrayContent += `        "careersUrl": ${JSON.stringify(program.careersUrl)},\n`;
      }
      newArrayContent += `        "pdfLinks": ${JSON.stringify(program.pdfLinks)},\n`;
      newArrayContent += `        "careerProspects": [\n`;
      program.careerProspects.forEach((cp, cpIdx) => {
        newArrayContent += `          ${JSON.stringify(cp)}${cpIdx < program.careerProspects.length - 1 ? "," : ""}\n`;
      });
      newArrayContent += `        ]\n`;
      newArrayContent += `      }${pIdx < entry.programs.length - 1 ? "," : ""}\n`;
    });
    newArrayContent += `    ],\n`;
    if (entry.field) {
      newArrayContent += `    "field": ${JSON.stringify(entry.field)}\n`;
    }
    newArrayContent += `  }${idx < mapping.length - 1 ? "," : ""}\n`;
  });
  newArrayContent += "];\n";

  const newFileContent = beforeArray + newArrayContent + afterArray;
  writeFileSync(DATA_FILE, newFileContent, "utf-8");

  console.log(`\n✓ Merged ${mergeCount} similar career mappings`);
  if (merges.length > 0) {
    console.log("\nMerges applied:");
    merges.forEach(merge => console.log(`  - ${merge}`));
  }
  console.log(`\n✓ Updated ${DATA_FILE}`);
}

mergeSimilarCareers().catch(console.error);
