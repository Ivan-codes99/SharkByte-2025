# Backend Environment Setup

## Environment Variables

For Cloudflare Workers, environment variables are configured differently than traditional Node.js apps.

### Local Development

1. Create a `.dev.vars` file in the `backend/` directory:
```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

2. Wrangler will automatically load `.dev.vars` for local development.

**Note:** `.dev.vars` should be in `.gitignore` and never committed.

### Production/Deployment

For production, use Wrangler secrets:
```bash
wrangler secret put GEMINI_API_KEY
```

### Required Variables

- `GEMINI_API_KEY` - Your Google Gemini API key for PDF processing and AI enhancements
  - Get your key from: https://makersuite.google.com/app/apikey

### Optional Variables

- `PROGRAM_CACHE_ID` - KV Namespace ID for caching (if using KV storage)
- `D1_DATABASE_ID` - D1 Database ID (if using D1 database)

These are configured in `wrangler.toml` under `[[kv_namespaces]]` and `[[d1_databases]]` sections.

