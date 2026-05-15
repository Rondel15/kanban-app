const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware');

const router = express.Router();
router.use(authenticateToken);

async function getColumnProject(columnId) {
  const r = await pool.query('SELECT project_id FROM columns WHERE id = $1', [columnId]);
  return r.rows[0]?.project_id;
}

async function isMember(projectId, userId) {
  const r = await pool.query(
    'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return r.rows.length > 0;
}

// POST /tasks — create a task
router.post('/', async (req, res) => {
  try {
    const { column_id, title, description, priority, due_date, assignee_id } = req.body;

    if (!column_id || !title)
      return res.status(400).json({ error: 'column_id and title required' });

    const projectId = await getColumnProject(column_id);
    if (!projectId) return res.status(404).json({ error: 'Column not found' });

    if (!await isMember(projectId, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tasks WHERE column_id = $1',
      [column_id]
    );
    const position = posResult.rows[0].next_pos;

    const result = await pool.query(
      `INSERT INTO tasks (column_id, title, description, priority, due_date, assignee_id, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [column_id, title, description || null, priority || 'medium', due_date || null, assignee_id || null, position]
    );

    // Fetch with assignee username
    const task = await pool.query(
      `SELECT t.*, u.username AS assignee_username
       FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(task.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create task' });
  }
});

// PATCH /tasks/:id — update task fields
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, due_date, assignee_id } = req.body;

    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!taskResult.rows[0]) return res.status(404).json({ error: 'Task not found' });

    const projectId = await getColumnProject(taskResult.rows[0].column_id);
    if (!await isMember(projectId, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    const result = await pool.query(
      `UPDATE tasks SET
        title       = COALESCE($1, title),
        description = COALESCE($2, description),
        priority    = COALESCE($3, priority),
        due_date    = COALESCE($4, due_date),
        assignee_id = $5
       WHERE id = $6 RETURNING *`,
      [title, description, priority, due_date, assignee_id ?? taskResult.rows[0].assignee_id, id]
    );

    const task = await pool.query(
      `SELECT t.*, u.username AS assignee_username
       FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.json(task.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update task' });
  }
});

// PATCH /tasks/:id/move — move task to a different column + update positions
router.patch('/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { column_id, position } = req.body;

    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!taskResult.rows[0]) return res.status(404).json({ error: 'Task not found' });

    const projectId = await getColumnProject(column_id);
    if (!await isMember(projectId, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    await pool.query(
      'UPDATE tasks SET column_id = $1, position = $2 WHERE id = $3',
      [column_id, position, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not move task' });
  }
});

// DELETE /tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!taskResult.rows[0]) return res.status(404).json({ error: 'Task not found' });

    const projectId = await getColumnProject(taskResult.rows[0].column_id);
    if (!await isMember(projectId, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete task' });
  }
});

module.exports = router;
