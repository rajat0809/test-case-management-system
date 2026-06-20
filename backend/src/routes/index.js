const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { authLimiter, testCaseLimiter, executionLimiter, analyticsLimiter } = require('../middleware/rateLimiter');

const authCtrl = require('../controllers/authController');
const projectCtrl = require('../controllers/projectController');
const tcCtrl = require('../controllers/testCaseController');
const suiteCtrl = require('../controllers/testSuiteController');
const execCtrl = require('../controllers/executionController');
const analyticsCtrl = require('../controllers/analyticsController');

const WRITE_ROLES = ['admin', 'test-lead'];
const EXEC_ROLES = ['admin', 'test-lead', 'tester'];

// ── Auth ──────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [admin, test-lead, tester, read-only] }
 *     responses:
 *       201: { description: User created }
 */
router.post('/auth/register', authLimiter, authCtrl.register);
router.post('/auth/login', authLimiter, authCtrl.login);
router.get('/auth/me', authenticate, authCtrl.getMe);

// ── Projects ──────────────────────────────────────────
router.get('/projects', authenticate, projectCtrl.getAll);
router.get('/projects/:id', authenticate, projectCtrl.getOne);
router.post('/projects', authenticate, authorize(...WRITE_ROLES), projectCtrl.create);
router.put('/projects/:id', authenticate, authorize(...WRITE_ROLES), projectCtrl.update);
router.delete('/projects/:id', authenticate, authorize('admin'), projectCtrl.delete);
router.post('/projects/:id/members', authenticate, authorize(...WRITE_ROLES), projectCtrl.addMember);
router.delete('/projects/:id/members/:userId', authenticate, authorize('admin'), projectCtrl.removeMember);

// ── Test Cases ────────────────────────────────────────
router.get('/testcases', authenticate, testCaseLimiter, tcCtrl.getAll);
router.get('/testcases/:id', authenticate, tcCtrl.getOne);
router.post('/testcases', authenticate, authorize(...WRITE_ROLES), testCaseLimiter, tcCtrl.create);
router.put('/testcases/:id', authenticate, authorize(...WRITE_ROLES), testCaseLimiter, tcCtrl.update);
router.delete('/testcases/:id', authenticate, authorize(...WRITE_ROLES), tcCtrl.delete);
router.post('/testcases/bulk', authenticate, authorize(...WRITE_ROLES), tcCtrl.bulkOp);

// ── Test Suites ───────────────────────────────────────
router.get('/testsuites', authenticate, suiteCtrl.getAll);
router.get('/testsuites/:id', authenticate, suiteCtrl.getOne);
router.post('/testsuites', authenticate, authorize(...WRITE_ROLES), suiteCtrl.create);
router.put('/testsuites/:id', authenticate, authorize(...WRITE_ROLES), suiteCtrl.update);
router.delete('/testsuites/:id', authenticate, authorize(...WRITE_ROLES), suiteCtrl.delete);
router.post('/testsuites/:id/cases', authenticate, authorize(...WRITE_ROLES), suiteCtrl.addCase);
router.delete('/testsuites/:id/cases/:caseId', authenticate, authorize(...WRITE_ROLES), suiteCtrl.removeCase);

// ── Test Runs & Executions ────────────────────────────
router.get('/runs', authenticate, executionLimiter, execCtrl.getRuns);
router.post('/runs', authenticate, authorize(...EXEC_ROLES), executionLimiter, execCtrl.createRun);
router.get('/runs/:id', authenticate, execCtrl.getRunDetails);
router.put('/executions/:id', authenticate, authorize(...EXEC_ROLES), executionLimiter, execCtrl.updateExecution);

// ── Defects ───────────────────────────────────────────
router.get('/defects', authenticate, execCtrl.getDefects);
router.post('/defects', authenticate, authorize(...EXEC_ROLES), execCtrl.createDefect);
router.put('/defects/:id', authenticate, authorize(...EXEC_ROLES), execCtrl.updateDefect);

// ── Analytics ─────────────────────────────────────────
router.get('/analytics/:project_id', authenticate, analyticsLimiter, analyticsCtrl.getProjectAnalytics);

// ── Users (admin only) ────────────────────────────────
router.get('/users', authenticate, authorize('admin'), analyticsCtrl.getAllUsers);
router.put('/users/:id', authenticate, authorize('admin'), analyticsCtrl.updateUser);

module.exports = router;
