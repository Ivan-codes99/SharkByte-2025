# MDC Program Scraper

This script scrapes MDC program pages to build a mapping of career prospects to MDC programs with PDF links.

## Prerequisites

- Node.js 18+ installed
- TypeScript installed globally or via npm: `npm install -g typescript tsx`

## Usage

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Run the scraper script using the npm script:
   ```bash
   npm run scrape
   ```

   This will:
   - Scrape all MDC program pages
   - Extract career prospects and PDF links
   - Generate the mapping file at `src/data/career-program-mapping-data.ts`

## What it does

The scraper will:
1. Load program links from `src/data/mdc-program-links.json`
2. For each program page:
   - Extract the program name
   - Find PDF links (course list and sequence guide)
   - Extract career prospects (from the main page or careers subpage)
3. Build a mapping of career prospects → programs
4. Save the mapping to `src/data/career-program-mapping-data.ts`

## Program Links JSON File

The scraper reads program links from `src/data/mdc-program-links.json`. This file should contain:

```json
{
  "bachelors": [
    "https://www.mdc.edu/bsn/",
    "https://www.mdc.edu/leadershipandmanagementinnovation/",
    ...
  ],
  "associateArts": [
    "https://www.mdc.edu/ethnicstudies/",
    ...
  ],
  "associateScience": [
    "https://www.mdc.edu/airportmanagement/",
    ...
  ],
  "certificates": {
    "collegeCredit": [...],
    "advancedTechnical": [...],
    "careerTechnical": [...],
    "professionalPreparation": [...]
  }
}
```

**You need to populate this file with the actual program links from MDC's website.** You can:
- Manually collect links from the MDC program pages
- Use a browser extension to extract links
- Or provide the links in any format and we can convert them

This approach is more reliable than trying to extract links from HTML, as it ensures we only scrape actual program pages.

## Output

The generated file will contain:
- Career prospects mapped to their related MDC programs
- Program details including:
  - Program name and degree type
  - Program URL
  - PDF links (course list and sequence guide)
  - Career prospects for each program
  - School and concentration (if available)

## Notes

- The scraper includes delays between requests to avoid overwhelming MDC's servers
- Some programs may not have career prospects listed on their pages
- PDF links are extracted from the program pages, but some may be missing
- The scraper may need to be run periodically to keep the data up to date

## Manual Curation

After running the scraper, you may want to manually review and curate the data:
- Add missing career prospects
- Categorize careers into fields (Technology, Medicine, Education, etc.)
- Verify PDF links are correct
- Add any missing program information

