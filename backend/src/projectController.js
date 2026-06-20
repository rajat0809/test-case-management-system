const pool = require('../config/db');
const { cache } = require('../config/redis');

exports.getAll = async (req, res, next) => {
  try {
    const cacheKey = `projects:user:${req.user.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await pool.query(`
      SELECT p.*, u.name as created_by_name,
        COUNT(DISTINCT pm.user_id) as member_count,
        COUNT(DISTINCT tc.id) as test_case_count
      FROM projects p
      LEFT JOIN users u ON u.id = p.created_by
      LEFT JOIN project_members pm ON pm.project_id = p.id
      LEFT JOIN test_cases tc ON tc.project_id = p.id
      WHERE p.id IN (
        SELECT project_id FROM project_members WHERE user_id = $1
        UNION SELECT id FROM projects WHERE created_by = $1
      )
      GROUP BY p.id, u.name
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    await cache.set(cacheKey, result.rows, 3600);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, u.name as created_by_name FROM projects p
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.id = $1
    `, [id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Project not found' });

    const members = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, pm.joined_at
      FROM project_members pm JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1
    `, [id]);

    res.json({ ...result.rows[0], members: members.rows });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, version, status = 'active' } = req.body;
    const result = await pool.query(
      'INSERT INTO projects (name, description, version, status, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, description, version, status, req.user.id]
    );
    const project = result.rows[0];
    // Add creator as member
    await pool.query('INSERT INTO project_members (project_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [project.id, req.user.id]);
    await cache.delPattern('projects:*');
    res.status(201).json(project);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, version, status } = req.body;
    const result = await pool.query(
      'UPDATE projects SET name=$1, description=$2, version=$3, status=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [name, description, version, status, id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Project not found' });
    await cache.delPattern('projects:*');
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    await cache.delPattern('projects:*');
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
};

exports.addMember = async (req, res, next) => {
  try {
    const { user_id } = req.body;
    await pool.query(
      'INSERT INTO project_members (project_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, user_id]
    );
    await cache.delPattern('projects:*');
    res.json({ message: 'Member added' });
  } catch (err) { next(err); }
};

exports.removeMember = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM project_members WHERE project_id=$1 AND user_id=$2', [req.params.id, req.params.userId]);
    await cache.delPattern('projects:*');
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
};
