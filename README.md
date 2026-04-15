# PlanView — Gantt-First Project Management Platform

A modern, minimalistic project management SaaS where the primary experience is a full-width interactive Gantt timeline. Multi-tenant, scalable, and secure by design.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local dev without Docker)

### Run with Docker (recommended)
```bash
cp .env.example .env
docker compose up -d
```
- **Web app:** http://localhost:5173
- **API:** http://localhost:4000
- **API Docs:** http://localhost:4000/api/docs

### Seed demo data
```bash
docker compose exec api npm run seed
```
Login: `arjun@acme.com` / `password123`

### Run locally (without Docker)
```bash
# Start PostgreSQL and Redis (your own instances)
cp .env.example .env  # Edit DATABASE_URL and REDIS_URL

# Install dependencies
npm install

# Start API
cd apps/api && npm run start:dev

# Start Web (separate terminal)
cd apps/web && npm run dev
```

## Architecture

```
planview/
├── apps/
│   ├── api/          # NestJS backend (TypeScript)
│   │   ├── src/
│   │   │   ├── auth/         # JWT auth, registration, login
│   │   │   ├── common/       # Guards, decorators, middleware
│   │   │   ├── database/     # Entities, init.sql, seed
│   │   │   ├── projects/     # CRUD
│   │   │   ├── features/     # CRUD
│   │   │   ├── stories/      # CRUD + move/resize
│   │   │   ├── subtasks/     # CRUD + progress recalc
│   │   │   ├── dependencies/ # Create/delete with cycle detection
│   │   │   ├── timeline/     # Optimized Gantt data endpoint
│   │   │   ├── audit/        # Immutable audit log
│   │   │   └── users/        # User management
│   │   └── Dockerfile
│   └── web/          # React frontend (TypeScript + Vite)
│       ├── src/
│       │   ├── api/          # Axios client with JWT auto-refresh
│       │   ├── components/   # Gantt, Layout, Auth components
│       │   ├── hooks/        # React Query hooks
│       │   ├── pages/        # Login, Register, Gantt
│       │   └── stores/       # Zustand state management
│       └── Dockerfile
├── packages/
│   └── shared/       # Shared TypeScript types (API contracts)
└── docker-compose.yml
```

## Security Features
- **Multi-tenant isolation:** Row-Level Security (RLS) on all tables
- **JWT auth:** Short-lived access tokens (15min) + rotating refresh tokens
- **RBAC:** Owner → Admin → Manager → Member → Viewer
- **Bcrypt:** 12-round password hashing
- **Helmet + CORS:** HTTP security headers
- **Rate limiting:** Per-tenant throttling at 3 tiers
- **Input validation:** class-validator whitelist mode (strips unknown fields)
- **Audit logging:** Every mutation logged with actor, changes, IP hash

## API Endpoints

| Resource     | Method | Path                              |
|-------------|--------|-----------------------------------|
| Auth        | POST   | `/api/v1/auth/register`           |
| Auth        | POST   | `/api/v1/auth/login`              |
| Auth        | POST   | `/api/v1/auth/refresh`            |
| Projects    | CRUD   | `/api/v1/projects`                |
| Features    | CRUD   | `/api/v1/features`                |
| Stories     | CRUD   | `/api/v1/stories`                 |
| Stories     | PATCH  | `/api/v1/stories/:id/move`        |
| Subtasks    | CRUD   | `/api/v1/subtasks`                |
| Dependencies| C/D    | `/api/v1/dependencies`            |
| Timeline    | GET    | `/api/v1/timeline`                |
| Summary     | GET    | `/api/v1/timeline/summary`        |
| Users       | GET    | `/api/v1/users`                   |
