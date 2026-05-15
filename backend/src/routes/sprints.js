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

// GET /projects/:projectId/sprint — get active sprint + snapshots
router.get('/:projectId/sprint', async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!await isMember(projectId, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    // Get active sprint (most recent one that hasn't ended)
    const sprintResult = await pool.query(
      `SELECT * FROM sprints
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [projectId]
    );

    if (!sprintResult.rows[0])
      return res.json({ sprint: null, snapshots: [] });

    const sprint = sprintResult.rows[0];

    // Get all snapshots for this sprint
    const snapshots = await pool.query(
      `SELECT * FROM sprint_snapshots
       WHERE sprint_id = $1
       ORDER BY recorded_at ASC`,
      [sprint.id]
    );

    res.json({ sprint, snapshots: snapshots.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch sprint' });
  }
});

// POST /projects/:projectId/sprint — create a new sprint
router.post('/:projectId/sprint', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, start_date, end_date } = req.body;

    if (!await isMember(projectId, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    if (!name || !start_date || !end_date)
      return res.status(400).json({ error: 'name, start_date, end_date required' });

    // Get current task count for initial snapshot
    const taskCount = await pool.query(
      `SELECT COUNT(*) FROM tasks t
       JOIN columns c ON c.id = t.column_id
       WHERE c.project_id = $1`,
      [projectId]
    );

    const sprint = await pool.query(
      `INSERT INTO sprints (project_id, name, start_date, end_date, total_tasks)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [projectId, name, start_date, end_date, parseInt(taskCount.rows[0].count)]
    );

    // Record initial snapshot
    await pool.query(
      `INSERT INTO sprint_snapshots (sprint_id, remaining_tasks, recorded_at)
       VALUES ($1, $2, NOW())`,
      [sprint.rows[0].id, parseInt(taskCount.rows[0].count)]
    );

    res.status(201).json(sprint.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create sprint' });
  }
});

// POST /projects/:projectId/sprint/snapshot — record daily snapshot
// Called automatically when the board loads
router.post('/:projectId/sprint/snapshot', async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!await isMember(projectId, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    const sprintResult = await pool.query(
      `SELECT * FROM sprints WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [projectId]
    );

    if (!sprintResult.rows[0]) return res.json({ skipped: true });

    const sprint = sprintResult.rows[0];

    // Only record one snapshot per day
    const existing = await pool.query(
      `SELECT 1 FROM sprint_snapshots
       WHERE sprint_id = $1 AND recorded_at::date = NOW()::date`,
      [sprint.id]
    );
    if (existing.rows.length > 0) return res.json({ skipped: true });

    // Count tasks NOT in "Done" column
    const remaining = await pool.query(
      `SELECT COUNT(*) FROM tasks t
       JOIN columns c ON c.id = t.column_id
       WHERE c.project_id = $1
       AND LOWER(c.title) != 'done'`,
      [projectId]
    );

    await pool.query(
      `INSERT INTO sprint_snapshots (sprint_id, remaining_tasks, recorded_at)
       VALUES ($1, $2, NOW())`,
      [sprint.id, parseInt(remaining.rows[0].count)]
    );

    res.json({ recorded: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not record snapshot' });
  }
});

// DELETE /projects/:projectId/sprint — end/delete current sprint
router.delete('/:projectId/sprint', async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!await isMember(projectId, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    await pool.query(
      `DELETE FROM sprints WHERE project_id = $1 AND id = (
        SELECT id FROM sprints WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1
      )`,
      [projectId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete sprint' });
  }
});

module.exports = router;
