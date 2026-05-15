const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware');

const router = express.Router();
router.use(authenticateToken);

async function isMember(projectId, userId) {
  const r = await pool.query(
    'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return r.rows.length > 0;
}

// GET /projects/:projectId/columns — get all columns + tasks
router.get('/:projectId/columns', async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!await isMember(projectId, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    const columns = await pool.query(
      'SELECT * FROM columns WHERE project_id = $1 ORDER BY position ASC',
      [projectId]
    );

    const tasks = await pool.query(
      `SELECT t.*, u.username AS assignee_username
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.column_id IN (
         SELECT id FROM columns WHERE project_id = $1
       )
       ORDER BY t.position ASC`,
      [projectId]
    );

    // Attach tasks to their columns
    const result = columns.rows.map(col => ({
      ...col,
      tasks: tasks.rows.filter(t => t.column_id === col.id),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch columns' });
  }
});

// POST /projects/:projectId/columns — add a column
router.post('/:projectId/columns', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title } = req.body;

    if (!await isMember(projectId, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    if (!title) return res.status(400).json({ error: 'Title required' });

    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM columns WHERE project_id = $1',
      [projectId]
    );
    const position = posResult.rows[0].next_pos;

    const result = await pool.query(
      'INSERT INTO columns (project_id, title, position) VALUES ($1, $2, $3) RETURNING *',
      [projectId, title, position]
    );

    res.status(201).json({ ...result.rows[0], tasks: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create column' });
  }
});

// PATCH /columns/:id — rename column
router.patch('/columns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const colResult = await pool.query('SELECT * FROM columns WHERE id = $1', [id]);
    if (!colResult.rows[0]) return res.status(404).json({ error: 'Column not found' });

    if (!await isMember(colResult.rows[0].project_id, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    const result = await pool.query(
      'UPDATE columns SET title = $1 WHERE id = $2 RETURNING *',
      [title, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update column' });
  }
});

// DELETE /columns/:id — delete column (and its tasks via CASCADE)
router.delete('/columns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const colResult = await pool.query('SELECT * FROM columns WHERE id = $1', [id]);
    if (!colResult.rows[0]) return res.status(404).json({ error: 'Column not found' });

    if (!await isMember(colResult.rows[0].project_id, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    await pool.query('DELETE FROM columns WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete column' });
  }
});

// PATCH /projects/:projectId/columns/reorder — update column positions
router.patch('/:projectId/columns/reorder', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { columns } = req.body; // [{ id, position }]

    if (!await isMember(projectId, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const col of columns) {
        await client.query('UPDATE columns SET position = $1 WHERE id = $2', [col.position, col.id]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not reorder columns' });
  }
});

module.exports = router;
