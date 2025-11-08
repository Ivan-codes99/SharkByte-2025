# PathFundAI Backend

Educational pathway generation API for Miami Dade College students.

## Overview

This backend generates complete educational pathways from MDC's Associate degrees through Bachelor's, Master's, and PhD programs, including transfer information, certifications, and internships.

## Tech Stack

- **Cloudflare Workers** - Serverless runtime
- **Hono** - Fast web framework
- **TypeScript** - Type safety
- **Gemini API** - AI-powered pathway enhancement
- **KV Storage** - Caching (optional)
- **D1 Database** - Structured data (optional)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Set your Gemini API key:

```bash
wrangler secret put GEMINI_API_KEY
```

### 3. Set Up KV Namespace (Optional)

```bash
wrangler kv:namespace create "PROGRAM_CACHE"
```

Add the binding ID to `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "PROGRAM_CACHE"
id = "your-kv-namespace-id"
```

### 4. Development

```bash
npm run dev
```

### 5. Deploy

```bash
npm run deploy
```

## API Endpoints

### POST `/pathways/generate`

Generate a complete educational pathway for a career.

**Request Body:**
```json
{
  "career": "Computer Scientist",
  "startingInstitution": "MDC",
  "targetInstitutions": ["FIU", "UF", "FSU"],
  "includeGraduate": true,
  "includeCertifications": true
}
```

**Response:**
```json
{
  "career": "Computer Scientist",
  "primaryPathway": [...],
  "alternativePathways": [...],
  "totalDuration": "9 years",
  "metadata": {
    "generatedAt": "2024-11-08T...",
    "source": "PathFundAI Backend",
    "aiEnhanced": true
  }
}
```

### GET `/pathways/:career`

Get a cached pathway for a career.

### GET `/careers`

List available careers.

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main entry point, Hono routes
│   ├── types.ts              # TypeScript type definitions
│   ├── services/
│   │   └── pathway-generator.ts  # Core pathway generation logic
│   ├── data/
│   │   ├── mdc-programs.ts       # MDC program data
│   │   ├── transfer-universities.ts  # Transfer target data
│   │   ├── graduate-programs.ts     # MS/PhD program data
│   │   └── certifications.ts        # Professional certifications
│   └── lib/
│       ├── gemini.ts              # Gemini API integration
│       ├── storage.ts             # KV/D1 storage utilities
│       └── semester-utils.ts      # Semester date utilities
├── wrangler.toml            # Cloudflare Workers config
├── tsconfig.json            # TypeScript config
└── package.json
```

## Data Sources

The system currently uses curated sample data for:
- MDC Associate degree programs
- Transfer equivalencies (FIU, UF, FSU)
- Graduate program requirements
- Professional certifications

In production, this would be:
- Fetched from MDC's official catalog API
- Scraped from university websites
- Maintained in a database

## AI Integration

The Gemini API is used to:
- Fill in missing program information
- Recommend optimal timing for internships and exams
- Generate alternative pathway suggestions
- Enhance pathway recommendations

## License

Private project for PathFundAI.

