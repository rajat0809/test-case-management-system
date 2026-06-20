# Test Case Management System (TCMS)

A full-stack Test Case Management application built with the PERN stack (PostgreSQL, Express, React, Node.js) with Redis caching.

## Tech Stack
- **Frontend:** React 18+, React Router v6, Recharts, Tailwind CSS, Axios
- **Backend:** Node.js, Express.js, JWT Auth
- **Database:** PostgreSQL
- **Caching:** Redis
- **API Docs:** Swagger/OpenAPI

## Project Structure
```
tcms/
├── backend/         # Node.js + Express API
├── frontend/        # React 18 App
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd tcms

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend** — copy and edit:
```bash
cd backend
cp .env.example .env
# Edit .env with your DB/Redis credentials
```

**Frontend** — copy and edit:
```bash
cd frontend
cp .env.example .env
```

### 3. Database Setup
```bash
cd backend
npm run db:migrate   # Creates all tables
npm run db:seed      # Seeds demo data
```

### 4. Run
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

App runs at: http://localhost:5173  
API runs at: http://localhost:5000  
Swagger docs: http://localhost:5000/api-docs

## Demo Credentials
| Role       | Email                    | Password   |
|------------|--------------------------|------------|
| Admin      | admin@tcms.com           | Admin@123  |
| Test Lead  | testlead@tcms.com        | Lead@123   |
| Tester     | tester@tcms.com          | Tester@123 |
| Read Only  | readonly@tcms.com        | Read@123   |

## Features
- ✅ JWT Authentication + RBAC (4 roles)
- ✅ Project Management
- ✅ Test Case CRUD with rich attributes
- ✅ Test Suite Management
- ✅ Test Execution & Results Tracking
- ✅ Defect/Bug Tracking
- ✅ Analytics Dashboard (3 chart types)
- ✅ Redis Caching
- ✅ Rate Limiting
- ✅ Swagger API Docs
- ✅ Lazy Loading & Code Splitting
- ✅ Pagination & Search/Filter