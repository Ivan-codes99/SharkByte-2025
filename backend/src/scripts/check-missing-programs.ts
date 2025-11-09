/**
 * Check which programs from the JSON file are missing from the scraped data
 */

// @ts-ignore
import { readFileSync } from "fs";
// @ts-ignore
import { join, dirname } from "path";
// @ts-ignore
import { fileURLToPath } from "url";

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const linksFile = join(__dirname, "../data/mdc-program-links.json");
const dataFile = join(__dirname, "../data/career-program-mapping-data.ts");

function checkMissing() {
  console.log("=".repeat(80));
  console.log("🔍 CHECKING FOR MISSING PROGRAMS");
  console.log("=".repeat(80));
  console.log();

  // Load expected programs
  const linksData = JSON.parse(readFileSync(linksFile, "utf-8"));
  const expectedPrograms = new Set<string>();
  
  const allExpected = [
    ...(linksData.bachelors || []),
    ...(linksData.associateArts || []),
    ...(linksData.associateScience || []),
    ...(linksData.certificates?.collegeCredit || []),
    ...(linksData.certificates?.advancedTechnical || []),
    ...(linksData.certificates?.careerTechnical || []),
    ...(linksData.certificates?.professionalPreparation || []),
  ];
  
  allExpected.forEach(url => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const programId = pathname.split("/").filter(s => s.length > 0).pop() || "";
      if (programId) {
        expectedPrograms.add(programId);
      }
    } catch (e) {
      // Invalid URL, skip
    }
  });

  // Load scraped programs
  const dataContent = readFileSync(dataFile, "utf-8");
  const scrapedProgramIds = new Set<string>();
  
  const idMatches = dataContent.matchAll(/"id":\s*"([^"]+)"/g);
  for (const match of idMatches) {
    scrapedProgramIds.add(match[1]);
  }

  // Find missing
  const missing = Array.from(expectedPrograms).filter(id => !scrapedProgramIds.has(id));
  const extra = Array.from(scrapedProgramIds).filter(id => !expectedPrograms.has(id));

  console.log(`📋 Expected Programs: ${expectedPrograms.size}`);
  console.log(`✓ Scraped Programs: ${scrapedProgramIds.size}`);
  console.log(`⚠️  Missing Programs: ${missing.length}`);
  if (extra.length > 0) {
    console.log(`ℹ️  Extra Programs (not in JSON): ${extra.length}`);
  }
  console.log();

  if (missing.length > 0) {
    console.log("Missing Program IDs (first 20):");
    missing.slice(0, 20).forEach((id, i) => {
      console.log(`  ${i + 1}. ${id}`);
    });
    if (missing.length > 20) {
      console.log(`  ... and ${missing.length - 20} more`);
    }
    console.log();
  }

  // Check by category
  console.log("📊 BREAKDOWN BY CATEGORY:");
  console.log("─".repeat(80));
  
  const categories = {
    "Bachelors": linksData.bachelors || [],
    "Associate Arts": linksData.associateArts || [],
    "Associate Science": linksData.associateScience || [],
    "Certificates - CCC": linksData.certificates?.collegeCredit || [],
    "Certificates - ATC": linksData.certificates?.advancedTechnical || [],
    "Certificates - CTE": linksData.certificates?.careerTechnical || [],
    "Certificates - CPP": linksData.certificates?.professionalPreparation || [],
  };

  Object.entries(categories).forEach(([category, urls]) => {
    const categoryIds = new Set<string>();
    urls.forEach((url: string) => {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const programId = pathname.split("/").filter(s => s.length > 0).pop() || "";
        if (programId) {
          categoryIds.add(programId);
        }
      } catch (e) {
        // Skip invalid URLs
      }
    });

    const categoryScraped = Array.from(categoryIds).filter(id => scrapedProgramIds.has(id));
    const categoryMissing = Array.from(categoryIds).filter(id => !scrapedProgramIds.has(id));
    const percentage = ((categoryScraped.length / categoryIds.size) * 100).toFixed(1);

    console.log(`${category}:`);
    console.log(`  Expected: ${categoryIds.size}`);
    console.log(`  Scraped: ${categoryScraped.length} (${percentage}%)`);
    console.log(`  Missing: ${categoryMissing.length}`);
    if (categoryMissing.length > 0 && categoryMissing.length <= 5) {
      console.log(`  Missing IDs: ${categoryMissing.join(", ")}`);
    }
    console.log();
  });

  console.log("=".repeat(80));
  console.log("💡 RECOMMENDATION:");
  console.log("=".repeat(80));
  if (missing.length > 0) {
    console.log(`Re-run the scraper to capture the ${missing.length} missing programs.`);
    console.log(`The scraper should complete all ${expectedPrograms.size} programs.`);
  } else {
    console.log("✓ All expected programs have been scraped!");
  }
  console.log("=".repeat(80));
}

checkMissing();

