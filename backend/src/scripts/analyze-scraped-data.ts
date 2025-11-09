/**
 * Analyze scraped MDC program data and generate statistics
 */

// @ts-ignore - Node.js types available at runtime
import { readFileSync } from "fs";
// @ts-ignore
import { join, dirname } from "path";
// @ts-ignore
import { fileURLToPath } from "url";

// @ts-ignore - import.meta.url is available in Node.js ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataFile = join(__dirname, "../data/career-program-mapping-data.ts");

function analyzeData() {
  console.log("=".repeat(80));
  console.log("📊 ANALYZING SCRAPED MDC PROGRAM DATA");
  console.log("=".repeat(80));
  console.log();

  const fileContent = readFileSync(dataFile, "utf-8");

  // Extract all programs
  const programMatches = fileContent.matchAll(/"id":\s*"([^"]+)"/g);
  const programs = Array.from(programMatches).map(m => m[1]);

  // Extract all unique programs with their details
  const programDetails: Map<string, {
    id: string;
    name: string;
    degreeType: string;
    hasCareers: boolean;
    careerCount: number;
    careersUrl?: string;
  }> = new Map();

  // Extract program objects
  const programObjectPattern = /"id":\s*"([^"]+)",\s*"name":\s*"([^"]+)",\s*"degreeType":\s*"([^"]+)",[\s\S]*?"careerProspects":\s*\[([\s\S]*?)\]/g;
  let match;
  while ((match = programObjectPattern.exec(fileContent)) !== null) {
    const id = match[1];
    const name = match[2];
    const degreeType = match[3];
    const careerProspectsText = match[4];
    
    // Count careers
    const careerMatches = careerProspectsText.match(/"([^"]+)"/g) || [];
    const careerCount = careerMatches.length;
    
    // Check for careersUrl
    const careersUrlMatch = fileContent.substring(match.index).match(/"careersUrl":\s*"([^"]+)"/);
    const careersUrl = careersUrlMatch ? careersUrlMatch[1] : undefined;

    if (!programDetails.has(id)) {
      programDetails.set(id, {
        id,
        name,
        degreeType,
        hasCareers: careerCount > 0,
        careerCount,
        careersUrl,
      });
    }
  }

  // Extract unique careers
  const careerMatches = fileContent.matchAll(/"career":\s*"([^"]+)"/g);
  const uniqueCareers = new Set(Array.from(careerMatches).map(m => m[1]));

  // Count programs by degree type
  const programsByDegree: Record<string, number> = {};
  const programsWithCareersByDegree: Record<string, number> = {};
  const programsWithoutCareersByDegree: Record<string, number> = {};

  programDetails.forEach(program => {
    programsByDegree[program.degreeType] = (programsByDegree[program.degreeType] || 0) + 1;
    if (program.hasCareers) {
      programsWithCareersByDegree[program.degreeType] = (programsWithCareersByDegree[program.degreeType] || 0) + 1;
    } else {
      programsWithoutCareersByDegree[program.degreeType] = (programsWithoutCareersByDegree[program.degreeType] || 0) + 1;
    }
  });

  // Check for problematic program names
  const problematicNames = {
    "Academics": 0,
    "Unknown Program": 0,
    "Other generic": 0,
  };

  programDetails.forEach(program => {
    const nameLower = program.name.toLowerCase();
    if (nameLower === "academics") {
      problematicNames["Academics"]++;
    } else if (nameLower === "unknown program") {
      problematicNames["Unknown Program"]++;
    } else if (nameLower.length < 5 || nameLower.includes("page") || nameLower.includes("error")) {
      problematicNames["Other generic"]++;
    }
  });

  // Count programs with careersUrl
  let programsWithCareersUrl = 0;
  programDetails.forEach(program => {
    if (program.careersUrl) {
      programsWithCareersUrl++;
    }
  });

  // Calculate total career-program mappings
  const mappingMatches = fileContent.matchAll(/\{\s*"career":/g);
  const totalMappings = Array.from(mappingMatches).length;

  // Calculate average careers per program
  const totalCareersAcrossPrograms = Array.from(programDetails.values())
    .reduce((sum, p) => sum + p.careerCount, 0);
  const avgCareersPerProgram = totalCareersAcrossPrograms / programDetails.size;

  // Print statistics
  console.log("📈 OVERALL STATISTICS");
  console.log("─".repeat(80));
  console.log(`Total Programs Scraped: ${programDetails.size}`);
  console.log(`Total Unique Careers: ${uniqueCareers.size}`);
  console.log(`Total Career-Program Mappings: ${totalMappings}`);
  console.log();

  console.log("🎓 PROGRAMS BY DEGREE TYPE");
  console.log("─".repeat(80));
  Object.entries(programsByDegree).sort((a, b) => b[1] - a[1]).forEach(([degree, count]) => {
    const withCareers = programsWithCareersByDegree[degree] || 0;
    const withoutCareers = programsWithoutCareersByDegree[degree] || 0;
    const percentage = ((withCareers / count) * 100).toFixed(1);
    console.log(`  ${degree}: ${count} total (${withCareers} with careers, ${withoutCareers} without)`);
    console.log(`    Success rate: ${percentage}%`);
  });
  console.log();

  console.log("✅ CAREER EXTRACTION SUCCESS");
  console.log("─".repeat(80));
  const totalWithCareers = Array.from(programDetails.values()).filter(p => p.hasCareers).length;
  const totalWithoutCareers = programDetails.size - totalWithCareers;
  const overallSuccessRate = ((totalWithCareers / programDetails.size) * 100).toFixed(1);
  console.log(`Programs with Careers: ${totalWithCareers} (${overallSuccessRate}%)`);
  console.log(`Programs without Careers: ${totalWithoutCareers} (${(100 - parseFloat(overallSuccessRate)).toFixed(1)}%)`);
  console.log(`Average Careers per Program: ${avgCareersPerProgram.toFixed(1)}`);
  console.log(`Programs with Careers URL: ${programsWithCareersUrl}`);
  console.log();

  console.log("⚠️  DATA QUALITY ISSUES");
  console.log("─".repeat(80));
  const totalProblematic = Object.values(problematicNames).reduce((a, b) => a + b, 0);
  if (totalProblematic > 0) {
    console.log(`Programs with Problematic Names: ${totalProblematic}`);
    Object.entries(problematicNames).forEach(([issue, count]) => {
      if (count > 0) {
        console.log(`  - ${issue}: ${count}`);
      }
    });
  } else {
    console.log("  ✓ No problematic program names detected");
  }
  console.log();

  console.log("📋 SAMPLE DATA");
  console.log("─".repeat(80));
  console.log("Sample Careers (first 10):");
  Array.from(uniqueCareers).slice(0, 10).forEach((career, i) => {
    console.log(`  ${i + 1}. ${career}`);
  });
  console.log();

  console.log("Sample Programs with Careers (first 5):");
  Array.from(programDetails.values())
    .filter(p => p.hasCareers)
    .slice(0, 5)
    .forEach((program, i) => {
      console.log(`  ${i + 1}. ${program.name} (${program.degreeType}) - ${program.careerCount} careers`);
    });
  console.log();

  console.log("Sample Programs without Careers (first 5):");
  Array.from(programDetails.values())
    .filter(p => !p.hasCareers)
    .slice(0, 5)
    .forEach((program, i) => {
      console.log(`  ${i + 1}. ${program.name} (${program.degreeType})`);
    });
  console.log();

  // Check expected vs actual
  const linksFile = join(__dirname, "../data/mdc-program-links.json");
  let expectedTotal = 0;
  try {
    const linksData = JSON.parse(readFileSync(linksFile, "utf-8"));
    expectedTotal = 
      (linksData.bachelors?.length || 0) +
      (linksData.associateArts?.length || 0) +
      (linksData.associateScience?.length || 0) +
      (linksData.certificates?.collegeCredit?.length || 0) +
      (linksData.certificates?.advancedTechnical?.length || 0) +
      (linksData.certificates?.careerTechnical?.length || 0) +
      (linksData.certificates?.professionalPreparation?.length || 0);
  } catch (e) {
    // Couldn't read links file
  }

  // Summary
  console.log("=".repeat(80));
  console.log("📊 SUMMARY");
  console.log("=".repeat(80));
  if (expectedTotal > 0) {
    const completionRate = ((programDetails.size / expectedTotal) * 100).toFixed(1);
    const missing = expectedTotal - programDetails.size;
    console.log(`📋 Expected Programs: ${expectedTotal}`);
    console.log(`✓ Successfully Scraped: ${programDetails.size} (${completionRate}%)`);
    if (missing > 0) {
      console.log(`⚠️  Missing/Not Scraped: ${missing} (${(100 - parseFloat(completionRate)).toFixed(1)}%)`);
      console.log(`   Note: Scraper may have been stopped early or encountered errors`);
    }
    console.log();
  }
  console.log(`✓ Extracted ${uniqueCareers.size} unique career prospects`);
  console.log(`✓ ${totalWithCareers} programs (${overallSuccessRate}%) have career data`);
  console.log(`⚠️  ${totalWithoutCareers} programs (${(100 - parseFloat(overallSuccessRate)).toFixed(1)}%) missing career data`);
  if (totalProblematic > 0) {
    console.log(`⚠️  ${totalProblematic} programs have problematic names that may need manual review`);
  }
  console.log("=".repeat(80));
}

analyzeData();

