# PlanView — Project Specification

## What is this?
A Gantt-first project management SaaS platform. Multi-tenant, scalable, secure. The primary UI is a full-width interactive Gantt timeline.

## Tech Stack
- **Backend:** NestJS 10 + TypeScript + TypeORM + PostgreSQL 16 + Redis 7
- **Frontend:** React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Zustand + TanStack React Query
- **Shared:** Monorepo (npm workspaces) with shared TypeScript types in `packages/shared`
- **Infra:** Docker Compose (dev), multi-stage Dockerfiles (prod-ready)

## Architecture
- Multi-tenant with Row-Level Security (RLS) on PostgreSQL
- JWT auth with refresh token rotation (bcrypt 12 rounds)
- Global guards: JwtAuthGuard → RolesGuard → ThrottlerGuard
- Tenant middleware extracts tenant_id from JWT, attaches to every request
- All queries tenant-scoped via `tenantId` parameter in services

## Data Model
Tenant → User, Project → Feature → Story → Subtask, Dependencies (Story↔Story)

## Key Patterns
- Services always take `tenantId` as first param
- `@Public()` decorator opts routes out of JWT auth
- `@Roles('admin', 'owner')` for RBAC
- `@TenantId()` and `@CurrentUser()` param decorators
- React Query for server state, Zustand for UI state
- Optimistic updates on story drag/move

## Running
```bash
cp .env.example .env
docker compose up -d
docker compose exec api npm run seed
# Open http://localhost:5173 → arjun@acme.com / password123
```

## Current Status
See HANDOFF_DOCUMENT.md for complete build state, what's done, and what's pending.
