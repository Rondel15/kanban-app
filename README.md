# Kanban Task Manager

A full-stack multi-user, multi-project Kanban board.

## Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + @dnd-kit + Zustand
- **Backend**: Node.js + Express + PostgreSQL + JWT

## Local Development

### Backend
```bash
cd backend
npm install
# Create .env with your DATABASE_URL and JWT_SECRET
npm run dev       # runs on port 4000
```

### Frontend
```bash
cd frontend
npm install
# .env already has VITE_API_URL=http://localhost:4000
npm run dev       # runs on port 5173
```

## Deployment

### Backend → Render
1. Push `backend/` to its own GitHub repo
2. Create a Render Web Service connected to that repo
3. Add env vars: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL`
4. Build command: `npm install`
5. Start command: `node src/server.js`

### Frontend → Vercel
1. Push `frontend/` to its own GitHub repo
2. Import into Vercel
3. Add env var: `VITE_API_URL=https://your-backend.onrender.com`
4. Vercel auto-detects Vite — no config needed

## Key Interview Talking Points

- **DnD with optimistic UI**: `moveTaskOptimistic` updates local state immediately on drag, then `moveTask` persists to DB — no lag for the user
- **JWT on both layers**: HTTP routes use `Authorization: Bearer` header; protected in middleware
- **Role-based access**: owner vs member enforced on every project/member route
- **DB transactions**: project creation uses `BEGIN/COMMIT` to atomically create project + add owner + seed columns
- **Zustand vs Redux**: Zustand is simpler, no boilerplate, still supports middleware like `persist`
