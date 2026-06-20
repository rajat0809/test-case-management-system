const pool = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hash = async (pw) => bcrypt.hash(pw, 10);

    // Users
    const adminRes = await client.query(`
      INSERT INTO users (name, email, password, role) VALUES
      ('Admin User', 'admin@tcms.com', $1, 'admin'),
      ('Test Lead', 'testlead@tcms.com', $2, 'test-lead'),
      ('Tester One', 'tester@tcms.com', $3, 'tester'),
      ('Read Only', 'readonly@tcms.com', $4, 'read-only')
      ON CONFLICT (email) DO NOTHING RETURNING id, role
    `, [await hash('Admin@123'), await hash('Lead@123'), await hash('Tester@123'), await hash('Read@123')]);

    // Fetch all users
    const users = await client.query(`SELECT id, role FROM users ORDER BY created_at`);
    const adminId = users.rows.find(u => u.role === 'admin')?.id;
    const leadId = users.rows.find(u => u.role === 'test-lead')?.id;
    const testerId = users.rows.find(u => u.role === 'tester')?.id;

    if (!adminId) { console.log('Users already seeded'); await client.query('COMMIT'); return; }

    // Project
    const projRes = await client.query(`
      INSERT INTO projects (name, description, version, status, created_by)
      VALUES ('E-Commerce Platform', 'Main e-commerce web application testing', 'v2.1.0', 'active', $1)
      RETURNING id
    `, [adminId]);
    const projectId = projRes.rows[0].id;

    // Project members
    await client.query(`
      INSERT INTO project_members (project_id, user_id) VALUES
      ($1, $2), ($1, $3), ($1, $4)
      ON CONFLICT DO NOTHING
    `, [projectId, leadId, testerId, users.rows.find(u=>u.role==='read-only')?.id]);

    // Suites
    const suiteRes = await client.query(`
      INSERT INTO test_suites (project_id, name, description, created_by) VALUES
      ($1, 'Authentication Suite', 'Login, Logout, Registration tests', $2),
      ($1, 'Product Management Suite', 'Product CRUD tests', $2),
      ($1, 'Checkout Suite', 'Cart and Checkout flow tests', $2)
      RETURNING id
    `, [projectId, leadId]);
    const [authSuite, productSuite, checkoutSuite] = suiteRes.rows;

    // Test Cases
    const tcRes = await client.query(`
      INSERT INTO test_cases (project_id, suite_id, title, description, priority, type, preconditions, postconditions, tags, created_by) VALUES
      ($1, $2, 'Valid User Login', 'Verify user can login with valid credentials', 'high', 'functional', 'User account exists', 'User is redirected to dashboard', ARRAY['login','smoke'], $3),
      ($1, $2, 'Invalid Password Login', 'Verify error on wrong password', 'high', 'functional', 'User account exists', 'Error message shown', ARRAY['login','negative'], $3),
      ($1, $2, 'User Registration', 'Verify new user registration flow', 'high', 'functional', 'Email not registered', 'User account created', ARRAY['registration'], $3),
      ($1, $4, 'Add Product to Catalog', 'Verify admin can add new product', 'medium', 'functional', 'Admin logged in', 'Product appears in catalog', ARRAY['product','crud'], $3),
      ($1, $4, 'Edit Product Details', 'Verify product edit functionality', 'medium', 'functional', 'Product exists', 'Product updated', ARRAY['product','crud'], $3),
      ($1, $5, 'Add Item to Cart', 'Verify user can add product to cart', 'high', 'functional', 'User logged in, product exists', 'Item in cart', ARRAY['cart','checkout'], $3),
      ($1, $5, 'Complete Checkout', 'Verify full checkout flow', 'critical', 'integration', 'Cart has items', 'Order placed successfully', ARRAY['checkout','payment'], $3),
      ($1, $5, 'Apply Discount Coupon', 'Verify coupon code application', 'low', 'functional', 'Valid coupon exists', 'Discount applied', ARRAY['checkout','coupon'], $3)
      RETURNING id
    `, [projectId, authSuite.id, leadId, productSuite.id, checkoutSuite.id]);

    // Steps for first test case
    await client.query(`
      INSERT INTO test_steps (test_case_id, step_number, action, expected_result) VALUES
      ($1, 1, 'Navigate to login page', 'Login page is displayed'),
      ($1, 2, 'Enter valid email and password', 'Credentials filled in form'),
      ($1, 3, 'Click Login button', 'User is redirected to dashboard'),
      ($1, 4, 'Verify user name in header', 'Logged in user name shown in header')
    `, [tcRes.rows[0].id]);

    // Test Run
    const runRes = await client.query(`
      INSERT INTO test_runs (project_id, suite_id, name, status, created_by)
      VALUES ($1, $2, 'Sprint 5 Regression Run', 'in-progress', $3)
      RETURNING id
    `, [projectId, authSuite.id, leadId]);
    const runId = runRes.rows[0].id;

    // Executions
    await client.query(`
      INSERT INTO test_executions (run_id, test_case_id, assigned_to, executed_by, status, comments, executed_at) VALUES
      ($1, $2, $3, $3, 'pass', 'Passed successfully', NOW()),
      ($1, $4, $3, $3, 'fail', 'Error message not shown correctly', NOW()),
      ($1, $5, $3, null, 'pending', null, null)
    `, [runId, tcRes.rows[0].id, testerId, tcRes.rows[1].id, tcRes.rows[2].id]);

    // Defect
    await client.query(`
      INSERT INTO defects (project_id, test_case_id, title, description, severity, status, reported_by)
      VALUES ($1, $2, 'Login error message missing', 'When wrong password is entered, error toast does not appear', 'high', 'open', $3)
    `, [projectId, tcRes.rows[1].id, testerId]);

    await client.query('COMMIT');
    console.log('✅ Seed complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
};

seed();
