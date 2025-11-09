# Frontend-Backend Connection Status

## ✅ **YES, they are connected!**

The frontend and backend are configured to work together:

### Connection Details

1. **Frontend API Configuration** (`frontend/src/lib/api.ts`):
   - Uses `VITE_API_URL` environment variable
   - **Default:** `http://localhost:8787` (if `VITE_API_URL` is not set)
   - This matches the default Wrangler dev server port

2. **Backend Server**:
   - Runs on port `8787` by default (Wrangler dev server)
   - Can be changed via `wrangler.toml` or command line flags

### How to Verify Connection

1. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```
   This starts the server at `http://localhost:8787`

2. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   This starts the frontend (usually at `http://localhost:5173`)

3. **Test the connection:**
   - Open browser DevTools → Network tab
   - Navigate to any page that makes API calls
   - You should see requests to `http://localhost:8787`

### API Endpoints Available

- `GET /` - Health check
- `GET /careers` - List available careers
- `POST /pathways/generate` - Generate pathway
- `GET /pathways/:career` - Get cached pathway
- `POST /programs/analyze` - Analyze PDFs (new!)

### Troubleshooting

If connection fails:
1. Ensure backend is running on port 8787
2. Check browser console for CORS errors
3. Verify `VITE_API_URL` in frontend `.env.local` matches backend URL
4. Check that both servers are running

