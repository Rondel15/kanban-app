require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const authRoutes     = require('./routes/auth');
const projectRoutes  = require('./routes/projects');
const columnRoutes   = require('./routes/columns');
const taskRoutes     = require('./routes/tasks');
const sprintRoutes   = require('./routes/sprints');

const app = express();

// Strip trailing slash and accept both with and without
const rawOrigin = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const clean = origin.replace(/\/$/, '');
    if (!rawOrigin || clean === rawOrigin) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/auth',     authRoutes);
app.use('/projects', projectRoutes);
app.use('/projects', columnRoutes);  // /projects/:projectId/columns
app.use('/tasks',    taskRoutes);
app.use('/projects', sprintRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error('[Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`
  ================================
   Kanban API running on port ${PORT}
  ================================
   POST /auth/register
   POST /auth/login
   GET  /auth/me
   GET  /projects
   POST /projects
   GET  /projects/:id
   GET  /projects/:id/columns
   POST /tasks
  `);
    });
  })
  .catch(err => {
    console.error('[DB] Init failed:', err);
    process.exit(1);
  });