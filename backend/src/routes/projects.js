const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware');

const router = express.Router();
router.use(authenticateToken);

// Helper — check if user is a member of a project
async function isMember(projectId, userId) {
  const result = await pool.query(
    'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return result.rows.length > 0;
}

// Helper — check if user is the owner
async function isOwner(projectId, userId) {
  const result = await pool.query(
    'SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2',
    [projectId, userId]
  );
  return result.rows.length > 0;
}

// GET /projects — list all projects the user belongs to
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.username AS owner_username,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch projects' });
  }
});

// POST /projects — create a project
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create project
      const proj = await client.query(
        'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
        [name, description || null, req.user.id]
      );
      const project = proj.rows[0];

      // Add owner as member with role 'owner'
      await client.query(
        'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
        [project.id, req.user.id, 'owner']
      );

      // Create default columns
      const defaultColumns = ['Backlog', 'In Progress', 'In Review', 'Done'];
      for (let i = 0; i < defaultColumns.length; i++) {
        await client.query(
          'INSERT INTO columns (project_id, title, position) VALUES ($1, $2, $3)',
          [project.id, defaultColumns[i], i]
        );
      }

      await client.query('COMMIT');
      res.status(201).json(project);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create project' });
  }
});

// GET /projects/:id — get project details + members
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!await isMember(id, req.user.id))
      return res.status(403).json({ error: 'Access denied' });

    const proj = await pool.query(
      `SELECT p.*, u.username AS owner_username
       FROM projects p JOIN users u ON u.id = p.owner_id
       WHERE p.id = $1`,
      [id]
    );
    if (!proj.rows[0]) return res.status(404).json({ error: 'Project not found' });

    const members = await pool.query(
      `SELECT u.id, u.username, pm.role
       FROM project_members pm JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1`,
      [id]
    );

    res.json({ ...proj.rows[0], members: members.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch project' });
  }
});

// PATCH /projects/:id — update name/description (owner only)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!await isOwner(id, req.user.id))
      return res.status(403).json({ error: 'Only the owner can edit this project' });

    const result = await pool.query(
      'UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
      [name, description, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update project' });
  }
});

// DELETE /projects/:id — owner only
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!await isOwner(id, req.user.id))
      return res.status(403).json({ error: 'Only the owner can delete this project' });

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete project' });
  }
});

// POST /projects/:id/members — invite by username (owner only)
router.post('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    if (!await isOwner(id, req.user.id))
      return res.status(403).json({ error: 'Only the owner can invite members' });

    const userResult = await pool.query('SELECT id, username FROM users WHERE username = $1', [username]);
    if (!userResult.rows[0])
      return res.status(404).json({ error: 'User not found' });

    const invitee = userResult.rows[0];

    const already = await pool.query(
      'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, invitee.id]
    );
    if (already.rows.length > 0)
      return res.status(409).json({ error: 'User is already a member' });

    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [id, invitee.id, 'member']
    );

    res.status(201).json({ id: invitee.id, username: invitee.username, role: 'member' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not add member' });
  }
});

// DELETE /projects/:id/members/:userId — remove member (owner only)
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;

    if (!await isOwner(id, req.user.id))
      return res.status(403).json({ error: 'Only the owner can remove members' });

    if (parseInt(userId) === req.user.id)
      return res.status(400).json({ error: 'Owner cannot remove themselves' });

    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not remove member' });
  }
});

module.exports = router;
