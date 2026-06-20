const pool = require('../config/db');
const { cache } = require('../config/redis');

exports.getAll = async (req, res, next) => {
  try {
    const { project_id, suite_id, priority, type, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (project_id) { params.push(project_id); conditions.push(`tc.project_id = $${params.length}`); }
    if (suite_id)   { params.push(suite_id);   conditions.push(`tc.suite_id = $${params.length}`); }
    if (priority)   { params.push(priority);   conditions.push(`tc.priority = $${params.length}`); }
    if (type)       { params.push(type);       conditions.push(`tc.type = $${params.length}`); }
    if (search)     { params.push(`%${search}%`); conditions.push(`(tc.title ILIKE $${params.length} OR tc.description ILIKE $${params.length})`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    params.push(limit); params.push(offset);
    const query = `
      SELECT tc.*, u.name as created_by_name, ts.name as suite_name,
        COUNT(*) OVER() as total_count
      FROM test_cases tc
      LEFT JOIN users u ON u.id = tc.created_by
      LEFT JOIN test_suites ts ON ts.id = tc.suite_id
      ${where}
      ORDER BY tc.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);
    const total = result.rows[0]?.total_count || 0;
    res.json({ data: result.rows, total: parseInt(total), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT tc.*, u.name as created_by_name FROM test_cases tc
      LEFT JOIN users u ON u.id = tc.created_by WHERE tc.id = $1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Test case not found' });

    const steps = await pool.query('SELECT * FROM test_steps WHERE test_case_id=$1 ORDER BY step_number', [req.params.id]);
    res.json({ ...result.rows[0], steps: steps.rows });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { project_id, suite_id, title, description, priority, type, preconditions, postconditions, tags, steps } = req.body;
    const tcResult = await pool.query(
      `INSERT INTO test_cases (project_id, suite_id, title, description, priority, type, preconditions, postconditions, tags, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`,
      [project_id, suite_id || null, title, description, priority || 'medium', type || 'functional', preconditions, postconditions, tags || [], req.user.id]
    );
    const tc = tcResult.rows[0];

    if (steps?.length) {
      for (const s of steps) {
        await pool.query(
          'INSERT INTO test_steps (test_case_id, step_number, action, expected_result) VALUES ($1,$2,$3,$4)',
          [tc.id, s.step_number, s.action, s.expected_result]
        );
      }
    }
    if (suite_id) {
      await pool.query('INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [suite_id, tc.id]);
    }
    await cache.delPattern(`analytics:${project_id}*`);
    res.status(201).json(tc);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { title, description, priority, type, preconditions, postconditions, tags, suite_id, steps } = req.body;
    const result = await pool.query(
      `UPDATE test_cases SET title=$1, description=$2, priority=$3, type=$4, preconditions=$5,
       postconditions=$6, tags=$7, suite_id=$8, updated_by=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [title, description, priority, type, preconditions, postconditions, tags, suite_id || null, req.user.id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Test case not found' });

    if (steps) {
      await pool.query('DELETE FROM test_steps WHERE test_case_id=$1', [req.params.id]);
      for (const s of steps) {
        await pool.query('INSERT INTO test_steps (test_case_id, step_number, action, expected_result) VALUES ($1,$2,$3,$4)',
          [req.params.id, s.step_number, s.action, s.expected_result]);
      }
    }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM test_cases WHERE id=$1', [req.params.id]);
    res.json({ message: 'Test case deleted' });
  } catch (err) { next(err); }
};

exports.bulkOp = async (req, res, next) => {
  try {
    const { ids, operation, value } = req.body;
    if (!ids?.length) return res.status(400).json({ message: 'No IDs provided' });

    if (operation === 'delete') {
      await pool.query('DELETE FROM test_cases WHERE id = ANY($1)', [ids]);
    } else if (operation === 'update_priority') {
      await pool.query('UPDATE test_cases SET priority=$1 WHERE id = ANY($2)', [value, ids]);
    } else if (operation === 'assign_suite') {
      await pool.query('UPDATE test_cases SET suite_id=$1 WHERE id = ANY($2)', [value, ids]);
    }
    res.json({ message: 'Bulk operation completed' });
  } catch (err) { next(err); }
};
