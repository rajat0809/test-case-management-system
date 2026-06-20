const pool = require('./db');
require('dotenv').config();

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'tester' CHECK (role IN ('admin','test-lead','tester','read-only')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        version VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','completed','archived')),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'tester',
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(project_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS test_suites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        suite_id UUID REFERENCES test_suites(id) ON DELETE SET NULL,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
        type VARCHAR(30) DEFAULT 'functional' CHECK (type IN ('functional','integration','regression','smoke','ui','api')),
        preconditions TEXT,
        postconditions TEXT,
        tags TEXT[],
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','deprecated')),
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS test_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
        step_number INT NOT NULL,
        action TEXT NOT NULL,
        expected_result TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS test_suite_cases (
        suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
        test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
        added_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (suite_id, test_case_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS test_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        suite_id UUID REFERENCES test_suites(id) ON DELETE SET NULL,
        name VARCHAR(200) NOT NULL,
        status VARCHAR(20) DEFAULT 'in-progress' CHECK (status IN ('in-progress','completed','aborted')),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS test_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
        test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
        assigned_to UUID REFERENCES users(id),
        executed_by UUID REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','pass','fail','blocked','skipped')),
        comments TEXT,
        executed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS defects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        execution_id UUID REFERENCES test_executions(id) ON DELETE SET NULL,
        test_case_id UUID REFERENCES test_cases(id) ON DELETE SET NULL,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in-progress','resolved','closed','wontfix')),
        reported_by UUID REFERENCES users(id),
        assigned_to UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_test_cases_project ON test_cases(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_test_cases_suite ON test_cases(suite_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_test_cases_priority ON test_cases(priority);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_test_executions_run ON test_executions(run_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_defects_project ON defects(project_id);`);

    await client.query('COMMIT');
    console.log('✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
};

migrate();
