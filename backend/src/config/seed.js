const pool = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hash = async (pw) => bcrypt.hash(pw, 10);

    await client.query(`
      INSERT INTO users (name, email, password, role) VALUES
      ('Admin User',    'admin@tcms.com',          $1, 'admin'),
      ('Test Lead',     'testlead@tcms.com',        $2, 'test-lead'),
      ('Rajat Chandak', 'rajatchandak@tcms.com',    $3, 'tester'),
      ('Tester One',    'tester@tcms.com',           $4, 'tester'),
      ('Read Only',     'readonly@tcms.com',         $5, 'read-only')
      ON CONFLICT (email) DO NOTHING
    `, [await hash('Admin@123'), await hash('Lead@123'), await hash('Rajat@123'), await hash('Tester@123'), await hash('Read@123')]);

    const users = await client.query(`SELECT id, email FROM users`);
    const byEmail = {};
    users.rows.forEach(u => byEmail[u.email] = u.id);
    const adminId = byEmail['admin@tcms.com'];
    const leadId  = byEmail['testlead@tcms.com'];
    const rajatId = byEmail['rajatchandak@tcms.com'];
    const testerId= byEmail['tester@tcms.com'];
    const readId  = byEmail['readonly@tcms.com'];

    const projRes = await client.query(`
      INSERT INTO projects (name, description, version, status, created_by)
      VALUES ('E-Commerce Platform', 'Main e-commerce web application', 'v2.1.0', 'active', $1)
      ON CONFLICT DO NOTHING RETURNING id
    `, [adminId]);
    let projectId;
    if (projRes.rows.length) { projectId = projRes.rows[0].id; }
    else { const ex = await client.query(`SELECT id FROM projects LIMIT 1`); projectId = ex.rows[0].id; }

    for (const uid of [leadId, rajatId, testerId, readId]) {
      await client.query(`INSERT INTO project_members (project_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [projectId, uid]);
    }

    const suiteRes = await client.query(`
      INSERT INTO test_suites (project_id, name, description, created_by) VALUES
      ($1, 'Authentication Suite',  'Login, logout, registration, password reset', $2),
      ($1, 'Checkout Suite',        'Cart, payment, coupon, order flows',           $2),
      ($1, 'Product Suite',         'Product CRUD, search, inventory',              $2),
      ($1, 'API Suite',             'REST endpoints, RBAC, rate limiting tests',    $2)
      RETURNING id, name
    `, [projectId, leadId]);
    const sm = {};
    suiteRes.rows.forEach(s => sm[s.name] = s.id);

    const tcRes = await client.query(`
      INSERT INTO test_cases (project_id, suite_id, title, description, priority, type, preconditions, postconditions, tags, created_by) VALUES
      ($1,$2,'Valid user login with correct credentials','Verify successful login','high','functional','Active user account exists','User on dashboard, JWT issued',ARRAY['login','smoke','positive'],$3),
      ($1,$2,'Login with wrong password — error message','Verify incorrect password shows error and blocks login','high','functional','User account exists','Error shown, no session created',ARRAY['login','negative','auth'],$3),
      ($1,$2,'Login with unregistered email','Handle login with email not in DB','medium','functional','Email not registered','No account found message shown',ARRAY['negative','boundary'],$3),
      ($1,$2,'Login with empty email field','Validate blank email field on submit','medium','functional','User on login page','Inline validation error, form not submitted',ARRAY['negative','validation'],$3),
      ($1,$2,'SQL injection in login field','Sanitisation prevents SQL attack via login','critical','functional','None','Input sanitised, no DB error exposed',ARRAY['security','negative','xss'],$3),
      ($1,$2,'Login with deactivated account','Deactivated users cannot login','high','functional','Account deactivated by admin','Account deactivated error shown',ARRAY['negative','rbac'],$3),
      ($1,$2,'Password reset with expired token','Expired token rejected on reset','high','regression','Token older than 24hr','Token expired error shown',ARRAY['negative','password-reset'],$3),
      ($1,$4,'Complete checkout with valid payment','End-to-end checkout with valid test card','critical','integration','Cart has items, valid card','Order placed, email sent, stock reduced',ARRAY['checkout','payment','smoke'],$3),
      ($1,$4,'Checkout with expired credit card','Expired card payment fails gracefully','high','functional','Cart has items','Payment declined error shown',ARRAY['negative','payment'],$3),
      ($1,$4,'Apply invalid coupon code','Non-existent coupon shows error','medium','functional','User on checkout page','Invalid coupon message shown',ARRAY['negative','coupon'],$3),
      ($1,$4,'Add out-of-stock product to cart','Stock=0 product cannot be added','medium','functional','Product stock = 0','Add to cart disabled or error shown',ARRAY['negative','boundary'],$3),
      ($1,$5,'Search product with valid keyword','Search returns relevant results','medium','functional','Products in catalogue','Matching products shown',ARRAY['search','positive'],$3),
      ($1,$5,'XSS payload in search field','Script tags sanitised in search','critical','functional','User on search page','Script not executed, shown as plain text',ARRAY['security','negative','xss'],$3),
      ($1,$6,'GET /api/products — valid token','Returns 200 with product list','medium','api','Valid JWT token','200 OK, JSON array returned',ARRAY['api','positive'],$3),
      ($1,$6,'GET /api/products — no token','Returns 401 when no auth header','high','api','No Authorization header','401 Unauthorized',ARRAY['api','negative','security'],$3),
      ($1,$6,'POST /api/testcases — read-only token','403 on write with read-only JWT','high','api','Read-only user JWT','403 Forbidden',ARRAY['api','rbac','negative'],$3),
      ($1,$6,'Login API — rate limit after 5 fails','429 after 5 failed logins in 15min','high','api','4 failed attempts already','429 Too Many Requests with retry-after header',ARRAY['api','negative','rate-limit'],$3)
      RETURNING id
    `, [projectId, sm['Authentication Suite'], leadId, sm['Checkout Suite'], sm['Product Suite'], sm['API Suite']]);

    // Steps for TC1 (valid login)
    await client.query(`INSERT INTO test_steps (test_case_id,step_number,action,expected_result) VALUES
      ($1,1,'Navigate to /login','Login page shown'),
      ($1,2,'Enter valid email','Field accepts input'),
      ($1,3,'Enter correct password','Masked characters shown'),
      ($1,4,'Click Sign In','Loading indicator appears'),
      ($1,5,'Observe redirect','User redirected to /dashboard'),
      ($1,6,'Check header','Username and role badge visible')
    `, [tcRes.rows[0].id]);

    // Steps for TC2 (wrong password negative)
    await client.query(`INSERT INTO test_steps (test_case_id,step_number,action,expected_result) VALUES
      ($1,1,'Navigate to /login','Login page shown'),
      ($1,2,'Enter valid registered email','Email accepted'),
      ($1,3,'Enter INCORRECT password','Masked input shown'),
      ($1,4,'Click Sign In','POST /api/auth/login called'),
      ($1,5,'Observe response','Error: Incorrect password. Please try again.'),
      ($1,6,'Check session','No JWT stored, user stays on login page')
    `, [tcRes.rows[1].id]);

    // Steps for TC5 (SQL injection)
    await client.query(`INSERT INTO test_steps (test_case_id,step_number,action,expected_result) VALUES
      ($1,1,'Navigate to /login','Login page shown'),
      ($1,2,'Enter payload: '' OR ''1''=''1 in email','Field accepts text'),
      ($1,3,'Enter any password','Field accepts input'),
      ($1,4,'Click Sign In','Request sent to backend'),
      ($1,5,'Observe response','401 returned, no SQL error message in response'),
      ($1,6,'Check server logs','express-validator blocked input, parameterised query used')
    `, [tcRes.rows[4].id]);

    const runRes = await client.query(`
      INSERT INTO test_runs (project_id, suite_id, name, status, created_by)
      VALUES ($1,$2,'Sprint 5 — Full Regression Run','in-progress',$3) RETURNING id
    `, [projectId, sm['Authentication Suite'], leadId]);
    const runId = runRes.rows[0].id;

    const execData = [
      [tcRes.rows[0].id, rajatId,  'pass',    'Passed on staging and production'],
      [tcRes.rows[1].id, rajatId,  'pass',    'Error toast shown correctly after wrong password'],
      [tcRes.rows[2].id, testerId, 'pass',    '"No account found" message displayed as expected'],
      [tcRes.rows[4].id, rajatId,  'pass',    'Input sanitised — no DB error exposed'],
      [tcRes.rows[7].id, rajatId,  'fail',    'Payment error message missing on mobile viewport (320px)'],
      [tcRes.rows[8].id, testerId, 'blocked', 'Coupon service returning 500 in staging'],
      [tcRes.rows[6].id, rajatId,  'pending', ''],
    ];
    for (const [tcId, by, status, comment] of execData) {
      await client.query(`
        INSERT INTO test_executions (run_id,test_case_id,assigned_to,executed_by,status,comments,executed_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [runId, tcId, rajatId, status !== 'pending' ? by : null, status, comment, status !== 'pending' ? new Date() : null]);
    }

    await client.query(`
      INSERT INTO defects (project_id,test_case_id,title,description,severity,status,reported_by,assigned_to) VALUES
      ($1,$2,'Payment error not shown on mobile checkout',
        'Expired card on 320px mobile viewport leaves user on blank screen with no error feedback.',
        'high','open',$3,$4),
      ($1,$5,'Coupon service 500 error in staging',
        '/api/coupons/validate returns 500 in staging. Likely misconfigured Redis TTL for coupon cache keys.',
        'critical','in-progress',$3,$6),
      ($1,$7,'Login button flickers on slow 3G',
        'Sign In button briefly disappears on throttled 3G before error toast appears. Minor UX issue.',
        'low','resolved',$8,$8)
    `, [
      projectId, tcRes.rows[7].id, rajatId, leadId,
      tcRes.rows[8].id, adminId,
      tcRes.rows[0].id, testerId,
    ]);

    await client.query('COMMIT');
    console.log('\n✅ Seed complete!\n');
    console.log('Demo credentials:');
    console.log('  Admin      → admin@tcms.com          / Admin@123');
    console.log('  Test Lead  → testlead@tcms.com       / Lead@123');
    console.log('  Rajat      → rajatchandak@tcms.com   / Rajat@123');
    console.log('  Tester     → tester@tcms.com         / Tester@123');
    console.log('  Read Only  → readonly@tcms.com       / Read@123\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
};

seed();