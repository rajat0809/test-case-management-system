# TCMS — Test Case Management System

A full-stack Test Case Management application built with the PERN stack (PostgreSQL, Express, React, Node.js) with Redis caching.

---

## Live Links

| | URL |
|---|---|
| **Live Demo** | https://test-case-management-system-pi.vercel.app |
| **API Docs (Swagger)** | https://test-case-management-system-kbsd.onrender.com/api-docs |
| **GitHub Repo** | https://github.com/rajat0809/test-case-management-system |

> **Note:** Backend is on Render free tier — first load after inactivity may take 30–40 seconds to wake up. All subsequent requests are fast.

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@tcms.com | Admin@123 |
| Test Lead | testlead@tcms.com | Lead@123 |
| Tester (Rajat) | rajatchandak@tcms.com | Rajat@123 |
| Read Only | readonly@tcms.com | Read@123 |

Try logging in with each role to see RBAC in action — navigation, buttons, and dashboard data all change per role.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, React Router v6 |
| Backend | Node.js, Express.js, JWT |
| Database | PostgreSQL (Neon) |
| Caching | Redis (Upstash) |
| API Docs | Swagger / OpenAPI 3.0 |
| Deployment | Vercel (frontend), Render (backend) |

---

## Features

### 1. User Authentication and RBAC
- JWT-based login and registration with protected routes
- 4 roles: `admin`, `test-lead`, `tester`, `read-only`
- Backend middleware enforcing route-level permissions
- Frontend conditional rendering per role — buttons, nav, dashboards
- Specific error messages for wrong password, unknown email, deactivated account

### 2. Project Management
- Create and manage multiple projects with version and status tracking
- Assign team members — restricted to admin and test-lead roles

### 3. Test Case Management
- Full CRUD — title, description, priority, type, pre/post-conditions, test steps, tags
- Positive and negative test cases pre-seeded (SQL injection, XSS, rate limiting, RBAC boundary, payment failure, expired token)
- Search by title or tag, filter by priority and type
- Bulk operations — delete and priority update across multiple cases
- Pagination (20 per page)

### 4. Test Suite Management
- Create and manage test suites
- Organise test cases within suites
- Suite-level case count and reporting

### 5. Test Execution
- Create test runs from suites
- Record results: Pass / Fail / Blocked / Skipped / Pending
- Progress bar and pass rate per run
- Create a defect directly from a failed execution
- Full execution history and audit trail

### 6. Defect Tracking
- Report bugs with severity, steps to reproduce, and assignee
- Link defects to test cases and executions
- Full lifecycle: `open` → `in-progress` → `resolved` → `closed` / `wontfix`

### 7. Analytics Dashboard
- Pie chart — test status distribution
- Bar chart — test cases by priority
- Line chart — 7-day execution trend
- Role-specific views (testers see only their assigned cases)

### 8. Performance and Security
- Redis caching with TTLs (analytics: 15 min, suites: 30 min, projects: 1 hr)
- Rate limiting per endpoint category
- Helmet.js security headers
- XSS and SQL injection prevention via express-validator
- Lazy loading with React.lazy() and Suspense on all routes
- useContext, useCallback, useMemo throughout
- Swagger/OpenAPI documentation

---

## Project Structure

```
tcms/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   ├── redis.js
│   │   │   ├── migrate.js
│   │   │   └── seed.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── projectController.js
│   │   │   ├── testCaseController.js
│   │   │   ├── testSuiteController.js
│   │   │   ├── executionController.js
│   │   │   └── analyticsController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── rateLimiter.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   └── index.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── common/
    │   │   └── layout/
    │   ├── contexts/
    │   │   ├── AuthContext.jsx
    │   │   └── ProjectContext.jsx
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── ProjectsPage.jsx
    │   │   ├── TestCasesPage.jsx
    │   │   ├── TestCaseDetailPage.jsx
    │   │   ├── TestSuitesPage.jsx
    │   │   ├── ExecutionsPage.jsx
    │   │   ├── DefectsPage.jsx
    │   │   └── UsersPage.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env.example
    └── package.json
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### 1. Clone the repo

```bash
git clone https://github.com/rajat0809/test-case-management-system.git
cd test-case-management-system
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DB and Redis credentials
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Runs on http://localhost:5000

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

Runs on http://localhost:5173

### 4. Backend .env reference

```
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tcms_db
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_SSL=false
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

---

## API Rate Limits

| Endpoint | Limit |
|----------|-------|
| Auth (login/register) | 5 requests per 15 minutes |
| Test case CRUD | 100 requests per hour |
| Test execution | 200 requests per hour |
| Analytics | 50 requests per hour |

---

## Database Schema

| Table | Purpose |
|-------|---------|
| users | User accounts with roles |
| projects | Test projects |
| project_members | Project to user mapping |
| test_suites | Test suite groupings |
| test_cases | Individual test cases |
| test_steps | Steps within a test case |
| test_suite_cases | Suite to case mapping |
| test_runs | Execution run instances |
| test_executions | Per-case execution results |
| defects | Bug and defect records |

---
