# PathFundAI Backend Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Gemini API Key

Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey) and set it:

```bash
wrangler secret put GEMINI_API_KEY
```

Enter your API key when prompted.

### 3. (Optional) Set Up KV Storage for Caching

```bash
# Create KV namespace
wrangler kv:namespace create "PROGRAM_CACHE"

# Get the binding ID from output, then add to wrangler.toml:
# [[kv_namespaces]]
# binding = "PROGRAM_CACHE"
# id = "your-kv-namespace-id"
```

### 4. (Optional) Set Up D1 Database

```bash
# Create D1 database
wrangler d1 create pathfundai-db

# Get the database ID from output, then add to wrangler.toml:
# [[d1_databases]]
# binding = "DB"
# database_name = "pathfundai-db"
# database_id = "your-database-id"
```

### 5. Run Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:8787`

### 6. Deploy to Cloudflare

```bash
npm run deploy
```

## Testing the API

### Generate a Pathway

```bash
curl -X POST http://localhost:8787/pathways/generate \
  -H "Content-Type: application/json" \
  -d '{
    "career": "Computer Scientist",
    "targetInstitutions": ["FIU", "UF"],
    "includeGraduate": true,
    "includeCertifications": true
  }'
```

### Get Cached Pathway

```bash
curl http://localhost:8787/pathways/Computer%20Scientist
```

### List Available Careers

```bash
curl http://localhost:8787/careers
```

## API Response Structure

The `/pathways/generate` endpoint returns a `GeneratedPathway` object:

```json
{
  "career": "Computer Scientist",
  "primaryPathway": [
    {
      "level": "AA",
      "institution": "MDC",
      "programName": "Associate in Arts - Computer Science",
      "courses": [...],
      "duration": "2 years",
      "startSemester": "FALL",
      "startYear": 2024
    },
    {
      "level": "BS",
      "institution": "FIU",
      "programName": "Bachelor of Science in Computer Science",
      "courses": [...],
      "transferTargets": [...],
      "internships": [...],
      "duration": "2 years"
    },
    {
      "level": "MS",
      "institution": "FIU",
      "programName": "Master of Science in Computer Science",
      "courses": [...],
      "exams": [...],
      "duration": "2 years"
    }
  ],
  "alternativePathways": [
    {
      "name": "UF Transfer Path",
      "description": "Alternative pathway transferring to UF",
      "levels": [...]
    }
  ],
  "totalDuration": "6 years",
  "metadata": {
    "generatedAt": "2024-11-08T...",
    "source": "PathFundAI Backend",
    "aiEnhanced": true
  }
}
```

## Adding New Programs

To add new MDC programs or transfer data:

1. **MDC Programs**: Edit `src/data/mdc-programs.ts`
2. **Transfer Targets**: Edit `src/data/transfer-universities.ts`
3. **Graduate Programs**: Edit `src/data/graduate-programs.ts`
4. **Certifications**: Edit `src/data/certifications.ts`

## Production Considerations

1. **Rate Limiting**: Add rate limiting middleware to prevent abuse
2. **Authentication**: Add API key authentication for production
3. **CORS**: Restrict CORS to your frontend domain
4. **Error Handling**: Enhance error messages and logging
5. **Data Sources**: Replace sample data with real MDC/university APIs
6. **Caching**: Use KV storage to cache frequently requested pathways
7. **Monitoring**: Set up Cloudflare Analytics and error tracking

## Troubleshooting

### TypeScript Errors

Run type checking:
```bash
npm run type-check
```

### Gemini API Errors

- Verify your API key is set correctly
- Check API quota limits
- Ensure the API key has access to Gemini Pro model

### KV Storage Errors

- Ensure KV namespace is created and bound in `wrangler.toml`
- Check that the binding name matches in code (`PROGRAM_CACHE`)

