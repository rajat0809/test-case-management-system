const pool = require('../config/db');
const { cache } = require('../config/redis');

exports.getAll = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const cacheKey = `suites:${project_id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await pool.query(`
      SELECT ts.*, u.name as created_by_name,
        COUNT(tsc.test_case_id) as test_case_count
      FROM test_suites ts
      LEFT JOIN users u ON u.id = ts.created_by
      LEFT JOIN test_suite_cases tsc ON tsc.suite_id = ts.id
      WHERE ts.project_id = $1
      GROUP BY ts.id, u.name
      ORDER BY ts.created_at DESC
    `, [project_id]);

    await cache.set(cacheKey, result.rows, 1800);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const suite = await pool.query('SELECT * FROM test_suites WHERE id=$1', [req.params.id]);
    if (!suite.rows.length) return res.status(404).json({ message: 'Suite not found' });

    const cases = await pool.query(`
      SELECT tc.* FROM test_cases tc
      JOIN test_suite_cases tsc ON tsc.test_case_id = tc.id
      WHERE tsc.suite_id = $1
    `, [req.params.id]);

    res.json({ ...suite.rows[0], test_cases: cases.rows });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { project_id, name, description } = req.body;
    const result = await pool.query(
      'INSERT INTO test_suites (project_id, name, description, created_by) VALUES ($1,$2,$3,$4) RETURNING *',
      [project_id, name, description, req.user.id]
    );
    await cache.delPattern(`suites:${project_id}*`);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const result = await pool.query(
      'UPDATE test_suites SET name=$1, description=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [name, description, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Suite not found' });
    await cache.delPattern('suites:*');
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM test_suites WHERE id=$1', [req.params.id]);
    await cache.delPattern('suites:*');
    res.json({ message: 'Suite deleted' });
  } catch (err) { next(err); }
};

exports.addCase = async (req, res, next) => {
  try {
    await pool.query('INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, req.body.test_case_id]);
    await cache.delPattern('suites:*');
    res.json({ message: 'Test case added to suite' });
  } catch (err) { next(err); }
};

exports.removeCase = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM test_suite_cases WHERE suite_id=$1 AND test_case_id=$2', [req.params.id, req.params.caseId]);
    await cache.delPattern('suites:*');
    res.json({ message: 'Test case removed from suite' });
  } catch (err) { next(err); }
};
