const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      username   TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS projects (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role        TEXT NOT NULL DEFAULT 'member',
      PRIMARY KEY (project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS columns (
      id         SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id          SERIAL PRIMARY KEY,
      column_id   INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT,
      priority    TEXT NOT NULL DEFAULT 'medium',
      due_date    DATE,
      assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      position    INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('[DB] Tables ready');
}

module.exports = { pool, initDb };
