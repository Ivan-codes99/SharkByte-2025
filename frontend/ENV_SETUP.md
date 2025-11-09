# Frontend Environment Setup

## Environment Variables

Vite automatically loads environment variables from `.env` files.

### Local Development

1. Create a `.env.local` file in the `frontend/` directory:
```bash
VITE_API_URL=http://localhost:8787
```

2. Vite will automatically load `.env.local` for local development.

**Note:** `.env.local` should be in `.gitignore` and never committed.

### Production

For production builds, set the environment variable:
```bash
VITE_API_URL=https://your-worker.your-subdomain.workers.dev
```

Or create a `.env.production` file:
```bash
VITE_API_URL=https://your-worker.your-subdomain.workers.dev
```

### Required Variables

- `VITE_API_URL` - Backend API URL
  - Default: `http://localhost:8787` (for local development)
  - Production: Your deployed Cloudflare Worker URL

### How It Works

The frontend reads `VITE_API_URL` from `import.meta.env.VITE_API_URL`. If not set, it defaults to `http://localhost:8787`.

