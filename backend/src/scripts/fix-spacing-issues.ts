/**
 * Script to fix spacing issues in career-program-mapping-data.ts
 * Fixes compound words that are missing spaces (e.g., "softwareengineer" -> "Software Engineer")
 * 
 * Run with: npm run fix-spacing
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
 * Split compound words into separate words
 * Handles common patterns like:
 * - softwareengineer -> Software Engineer
 * - accountingmanagement -> Accounting Management
 * - hospitalitymanagement -> Hospitality Management
 */
function fixSpacing(text: string): string {
  if (!text || text.length < 3) return text;
  
  let result = text;
  
  // First, fix incorrect splits that should be reverted (compound words that were incorrectly split)
  const incorrectSplits: [RegExp, string][] = [
    [/Bio Technology/gi, "Biotechnology"],
    [/Histo Technology/gi, "Histotechnology"],
    [/Neuro Science/gi, "Neuroscience"],
    [/Cyber Security/gi, "Cybersecurity"], // "Cybersecurity" is a valid single word
  ];
  
  for (const [pattern, replacement] of incorrectSplits) {
    result = result.replace(pattern, replacement);
  }
  
  // Now fix actual spacing issues (compound words that need splitting)
  // Only split obvious cases where there's no space between words
  
  // Split on lowercase followed by uppercase (camelCase) - but be careful
  result = result.replace(/([a-z])([A-Z][a-z]+)/g, (match, prefix, suffix) => {
    // Don't split if it's part of a known compound word
    const combined = (prefix + suffix).toLowerCase();
    const knownCompounds = [
      "cybersecurity", "biotechnology", "histotechnology", "neuroscience",
      "biomedical", "pharmaceutical", "forensic", "laboratory",
      "software", "hardware", "network", "computer", "information",
      "electronic", "electrical", "mechanical", "chemical", "environmental",
      "industrial", "aerospace", "structural", "architectural",
      "instructional", "curriculum", "academic", "research",
      "financial", "accounting", "hospitality", "human", "resource",
      "procurement", "logistics", "insurance", "enforcement", "criminal",
      "emergency", "corrections", "probation", "investigation", "forensics"
    ];
    
    if (knownCompounds.includes(combined)) {
      return match; // Keep as-is
    }
    
    // Split common word combinations that should have spaces
    const shouldSplit = [
      "softwareengineer", "softwareengineering", "accountingmanagement",
      "hospitalitymanagement", "humanresource", "projectmanagement",
      "supplychain", "datascience", "computerscience", "informationsystems",
      "healthservices", "businessoperations", "electronicsengineering"
    ];
    
    if (shouldSplit.includes(combined)) {
      return `${prefix} ${suffix}`;
    }
    
    // For other cases, only split if it looks like two distinct words
    // (prefix is a common word ending, suffix is a common word)
    const commonPrefixes = ["accounting", "hospitality", "human", "project", "supply", "data", "computer", "information", "health", "business", "electronics", "software", "hardware", "network"];
    const commonSuffixes = ["management", "engineering", "technology", "science", "systems", "services", "operations", "engineer", "developer", "analyst", "specialist"];
    
    if (commonPrefixes.includes(prefix.toLowerCase()) && commonSuffixes.some(s => suffix.toLowerCase().startsWith(s))) {
      return `${prefix} ${suffix}`;
    }
    
    return match; // Keep as-is if uncertain
  });
  
  // Split on numbers
  result = result.replace(/([a-z])([0-9])/g, "$1 $2");
  
  // Clean up extra spaces and capitalize properly
  result = result
    .replace(/\s+/g, " ") // Multiple spaces to single space
    .trim()
    .split(" ")
    .map(word => {
      // Capitalize first letter of each word, preserve rest
      if (word.length === 0) return word;
      // Preserve existing capitalization for acronyms and special cases
      if (word === word.toUpperCase() && word.length <= 5) {
        return word; // Keep acronyms like "BSN", "AA", "AS", "BS", "BA", "IoT", "API"
      }
      // Preserve "IoT" specifically
      if (word.toLowerCase() === "iot") {
        return "IoT";
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
  
  return result;
}

/**
 * Check if text needs spacing fixes
 */
function needsFix(text: string): boolean {
  if (!text || text.length < 3) return false;
  
  // Check for incorrect splits that need to be reverted
  if (/Bio Technology|Histo Technology|Neuro Science|Cyber Security/i.test(text)) {
    return true;
  }
  
  // Check for compound words (lowercase followed by uppercase or common patterns)
  // But skip if it already has proper spacing
  if (text.includes(" ")) {
    // Check if there are still compound words within that need splitting
    return /[a-z][A-Z]/.test(text.replace(/\s+/g, "")) || 
           /(software|accounting|hospitality|human|project|supply|data|computer|information|health|business|electronics)(engineer|engineering|management|science|systems|services|operations)/i.test(text.replace(/\s+/g, ""));
  }
  
  return /[a-z][A-Z]/.test(text) || 
         /(software|accounting|hospitality|human|project|supply|data|computer|information|health|business|electronics)(engineer|engineering|management|science|systems|services|operations)/i.test(text);
}

function fixMappingData() {
  console.log("=".repeat(80));
  console.log("Fixing spacing issues in career-program-mapping-data.ts");
  console.log("=".repeat(80));
  
  // Read the data file
  let fileContent = readFileSync(DATA_FILE, "utf-8");
  
  let fixesCount = 0;
  const fixes: string[] = [];
  
  // Fix program names - use a more precise pattern that handles the TypeScript structure
  const programNamePattern = /"name":\s*"([^"]+)"/g;
  let match;
  const processedNames = new Set<string>();
  
  while ((match = programNamePattern.exec(fileContent)) !== null) {
    const originalName = match[1];
    const fullMatch = match[0];
    
    if (!processedNames.has(originalName) && needsFix(originalName)) {
      const fixedName = fixSpacing(originalName);
      if (fixedName !== originalName) {
        // Replace all occurrences of this exact pattern
        const regex = new RegExp(`"name":\\s*"${originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
        fileContent = fileContent.replace(regex, `"name": "${fixedName}"`);
        fixes.push(`Program name: "${originalName}" -> "${fixedName}"`);
        fixesCount++;
        processedNames.add(originalName);
      }
    }
  }
  
  // Fix career names
  const careerPattern = /"career":\s*"([^"]+)"/g;
  const processedCareers = new Set<string>();
  
  while ((match = careerPattern.exec(fileContent)) !== null) {
    const originalCareer = match[1];
    
    if (!processedCareers.has(originalCareer) && needsFix(originalCareer)) {
      const fixedCareer = fixSpacing(originalCareer);
      if (fixedCareer !== originalCareer) {
        const regex = new RegExp(`"career":\\s*"${originalCareer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
        fileContent = fileContent.replace(regex, `"career": "${fixedCareer}"`);
        fixes.push(`Career: "${originalCareer}" -> "${fixedCareer}"`);
        fixesCount++;
        processedCareers.add(originalCareer);
      }
    }
  }
  
  // Fix career prospects - need to be more careful here to avoid replacing in wrong contexts
  const careerProspectPattern = /"careerProspects":\s*\[([^\]]+)\]/g;
  const processedProspects = new Set<string>();
  
  while ((match = careerProspectPattern.exec(fileContent)) !== null) {
    const prospectsContent = match[1];
    const prospectItemPattern = /"([^"]+)"/g;
    let prospectMatch;
    
    while ((prospectMatch = prospectItemPattern.exec(prospectsContent)) !== null) {
      const originalProspect = prospectMatch[1];
      
      if (!processedProspects.has(originalProspect) && needsFix(originalProspect)) {
        const fixedProspect = fixSpacing(originalProspect);
        if (fixedProspect !== originalProspect) {
          // Only replace within careerProspects arrays to avoid false matches
          const regex = new RegExp(`"${originalProspect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
          fileContent = fileContent.replace(regex, `"${fixedProspect}"`);
          fixes.push(`Career prospect: "${originalProspect}" -> "${fixedProspect}"`);
          fixesCount++;
          processedProspects.add(originalProspect);
        }
      }
    }
  }
  
  // Write the fixed content back
  writeFileSync(DATA_FILE, fileContent, "utf-8");
  
  console.log(`\n✓ Fixed ${fixesCount} spacing issues`);
  if (fixes.length > 0) {
    console.log("\nFixes applied:");
    fixes.slice(0, 30).forEach(fix => console.log(`  - ${fix}`));
    if (fixes.length > 30) {
      console.log(`  ... and ${fixes.length - 30} more`);
    }
  }
  console.log(`\n✓ Updated ${DATA_FILE}`);
}

fixMappingData();

