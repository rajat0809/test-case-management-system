const pool = require('../config/db');
const { cache } = require('../config/redis');

exports.getProjectAnalytics = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const cacheKey = `analytics:${project_id}:overview`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [execStats, priorityDist, trendData, testerStats, defectStats] = await Promise.all([
      // Execution summary
      pool.query(`
        SELECT
          COUNT(te.id) as total,
          COUNT(CASE WHEN te.status='pass' THEN 1 END) as passed,
          COUNT(CASE WHEN te.status='fail' THEN 1 END) as failed,
          COUNT(CASE WHEN te.status='blocked' THEN 1 END) as blocked,
          COUNT(CASE WHEN te.status='skipped' THEN 1 END) as skipped,
          COUNT(CASE WHEN te.status='pending' THEN 1 END) as pending
        FROM test_executions te
        JOIN test_runs tr ON tr.id = te.run_id
        WHERE tr.project_id = $1
      `, [project_id]),

      // Priority distribution
      pool.query(`
        SELECT priority, COUNT(*) as count FROM test_cases
        WHERE project_id = $1 GROUP BY priority
      `, [project_id]),

      // Trend data (last 7 days)
      pool.query(`
        SELECT
          DATE(te.executed_at) as date,
          COUNT(CASE WHEN te.status='pass' THEN 1 END) as passed,
          COUNT(CASE WHEN te.status='fail' THEN 1 END) as failed
        FROM test_executions te
        JOIN test_runs tr ON tr.id = te.run_id
        WHERE tr.project_id = $1 AND te.executed_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(te.executed_at)
        ORDER BY date
      `, [project_id]),

      // Tester performance
      pool.query(`
        SELECT u.name,
          COUNT(te.id) as assigned,
          COUNT(CASE WHEN te.status='pass' THEN 1 END) as passed,
          COUNT(CASE WHEN te.status='fail' THEN 1 END) as failed
        FROM test_executions te
        JOIN users u ON u.id = te.assigned_to
        JOIN test_runs tr ON tr.id = te.run_id
        WHERE tr.project_id = $1
        GROUP BY u.id, u.name
        ORDER BY assigned DESC LIMIT 10
      `, [project_id]),

      // Defect stats
      pool.query(`
        SELECT severity, status, COUNT(*) as count FROM defects
        WHERE project_id = $1 GROUP BY severity, status
      `, [project_id]),
    ]);

    const data = {
      execution_summary: execStats.rows[0],
      priority_distribution: priorityDist.rows,
      trend: trendData.rows,
      tester_stats: testerStats.rows,
      defect_stats: defectStats.rows,
    };

    await cache.set(cacheKey, data, 900); // 15 min
    res.json(data);
  } catch (err) { next(err); }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, role, is_active } = req.body;
    const result = await pool.query(
      'UPDATE users SET name=$1, role=$2, is_active=$3, updated_at=NOW() WHERE id=$4 RETURNING id, name, email, role, is_active',
      [name, role, is_active, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};
