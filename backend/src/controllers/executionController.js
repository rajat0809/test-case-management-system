const pool = require('../config/db');
const { cache } = require('../config/redis');

exports.getRuns = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const result = await pool.query(`
      SELECT tr.*, u.name as created_by_name,
        COUNT(te.id) as total_cases,
        COUNT(CASE WHEN te.status='pass' THEN 1 END) as passed,
        COUNT(CASE WHEN te.status='fail' THEN 1 END) as failed,
        COUNT(CASE WHEN te.status='pending' THEN 1 END) as pending
      FROM test_runs tr
      LEFT JOIN users u ON u.id = tr.created_by
      LEFT JOIN test_executions te ON te.run_id = tr.id
      WHERE tr.project_id = $1
      GROUP BY tr.id, u.name
      ORDER BY tr.created_at DESC
    `, [project_id]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.createRun = async (req, res, next) => {
  try {
    const { project_id, suite_id, name, test_case_ids } = req.body;
    const runResult = await pool.query(
      'INSERT INTO test_runs (project_id, suite_id, name, created_by) VALUES ($1,$2,$3,$4) RETURNING *',
      [project_id, suite_id || null, name, req.user.id]
    );
    const run = runResult.rows[0];

    // If suite_id, pull all cases from suite; else use provided ids
    let caseIds = test_case_ids || [];
    if (suite_id && !caseIds.length) {
      const cases = await pool.query('SELECT test_case_id FROM test_suite_cases WHERE suite_id=$1', [suite_id]);
      caseIds = cases.rows.map(r => r.test_case_id);
    }
    for (const cid of caseIds) {
      await pool.query('INSERT INTO test_executions (run_id, test_case_id) VALUES ($1,$2)', [run.id, cid]);
    }
    await cache.delPattern(`analytics:${project_id}*`);
    res.status(201).json(run);
  } catch (err) { next(err); }
};

exports.getRunDetails = async (req, res, next) => {
  try {
    const run = await pool.query('SELECT * FROM test_runs WHERE id=$1', [req.params.id]);
    if (!run.rows.length) return res.status(404).json({ message: 'Run not found' });

    const executions = await pool.query(`
      SELECT te.*, tc.title, tc.priority, tc.type,
        u1.name as assigned_to_name, u2.name as executed_by_name
      FROM test_executions te
      JOIN test_cases tc ON tc.id = te.test_case_id
      LEFT JOIN users u1 ON u1.id = te.assigned_to
      LEFT JOIN users u2 ON u2.id = te.executed_by
      WHERE te.run_id = $1
      ORDER BY tc.title
    `, [req.params.id]);

    res.json({ ...run.rows[0], executions: executions.rows });
  } catch (err) { next(err); }
};

exports.updateExecution = async (req, res, next) => {
  try {
    const { status, comments, assigned_to } = req.body;
    const result = await pool.query(
      `UPDATE test_executions SET status=$1, comments=$2, assigned_to=$3,
       executed_by=$4, executed_at=CASE WHEN $1 != 'pending' THEN NOW() ELSE executed_at END,
       updated_at=NOW() WHERE id=$5 RETURNING *`,
      [status, comments, assigned_to || null, req.user.id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Execution not found' });

    // Invalidate analytics cache
    const exec = result.rows[0];
    const run = await pool.query('SELECT project_id FROM test_runs WHERE id=$1', [exec.run_id]);
    if (run.rows.length) await cache.delPattern(`analytics:${run.rows[0].project_id}*`);

    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.getDefects = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const result = await pool.query(`
      SELECT d.*, u1.name as reported_by_name, u2.name as assigned_to_name, tc.title as test_case_title
      FROM defects d
      LEFT JOIN users u1 ON u1.id = d.reported_by
      LEFT JOIN users u2 ON u2.id = d.assigned_to
      LEFT JOIN test_cases tc ON tc.id = d.test_case_id
      WHERE d.project_id = $1
      ORDER BY d.created_at DESC
    `, [project_id]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.createDefect = async (req, res, next) => {
  try {
    const { project_id, execution_id, test_case_id, title, description, severity } = req.body;
    const result = await pool.query(
      'INSERT INTO defects (project_id, execution_id, test_case_id, title, description, severity, reported_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [project_id, execution_id || null, test_case_id || null, title, description, severity || 'medium', req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.updateDefect = async (req, res, next) => {
  try {
    const { title, description, severity, status, assigned_to } = req.body;
    const result = await pool.query(
      'UPDATE defects SET title=$1, description=$2, severity=$3, status=$4, assigned_to=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [title, description, severity, status, assigned_to || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};
