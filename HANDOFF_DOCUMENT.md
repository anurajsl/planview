# PlanView — Complete Build Handoff

**Project:** Gantt-first project management SaaS platform
**Codebase:** ~8,970 LOC across 104 files
**TRACE Coherence:** 12/12 PASS — 8 anchors, 27 consumers, 0 failures
**API:** 34 REST endpoints + 1 WebSocket namespace
**Database:** 13 tables with Row-Level Security (PostgreSQL 16)

---

## 1. WHAT IS PLANVIEW

A modern, minimalistic project management web application where the default experience is a full-width interactive Gantt timeline. Users understand project progress in 5 seconds. Built from day one as a multi-tenant SaaS with enterprise-grade security.

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10 + TypeScript 5.4 |
| Database | PostgreSQL 16 (Row-Level Security) |
| Cache | Redis 7 |
| Auth | Custom JWT (Passport) — bcrypt 12 rounds, refresh token rotation |
| Frontend | React 18 + Vite 5 + TypeScript |
| State (UI) | Zustand 4.5 |
| State (server) | TanStack React Query 5 |
| CSS | Tailwind CSS 3.4 + CSS variables (dark mode) |
| HTTP | Axios with JWT auto-refresh interceptor |
| Real-time | WebSocket (Socket.IO-compatible gateway) |
| Billing | Stripe (checkout, portal, webhooks, plan enforcement) |
| Monorepo | npm workspaces |
| Containers | Docker + Docker Compose |
| Coherence | TRACE (8 anchors, 27 consumers, 4 contracts) |

---

## 3. PROJECT STRUCTURE

```
planview/
├── package.json                    # Monorepo root
├── docker-compose.yml              # PG16 + Redis7 + API + Web
├── .env.example                    # All env vars documented
├── trace.yaml                      # TRACE coherence config
├── SPEC.md                         # Full project spec for AI IDEs
├── HANDOFF_DOCUMENT.md             # This file
├── KIRO_INSTRUCTIONS.md            # Kiro-specific setup guide
├── README.md                       # Setup + run instructions
│
├── packages/shared/src/index.ts    # ~500 lines: ALL types, enums, API contracts
│
├── apps/api/                       # NestJS backend (48 source files)
│   ├── src/
│   │   ├── main.ts                 # Bootstrap: Helmet, CORS, Swagger
│   │   ├── app.module.ts           # 14 modules, 3 global guards, tenant middleware
│   │   ├── auth/                   # JWT register/login/refresh/logout
│   │   ├── common/                 # Guards (JWT, RBAC), decorators, tenant middleware
│   │   ├── database/
│   │   │   ├── init.sql            # 13 tables + RLS + triggers
│   │   │   ├── entities.ts         # All TypeORM entities
│   │   │   └── seed.ts             # Demo data (5 users, 9 stories)
│   │   ├── projects/               # CRUD + members
│   │   ├── features/               # CRUD + sort order
│   │   ├── stories/                # CRUD + move + WebSocket broadcast
│   │   ├── subtasks/               # CRUD + auto progress recalc
│   │   ├── dependencies/           # Create/delete + cycle detection
│   │   ├── timeline/               # Optimized Gantt query + smart summary
│   │   ├── users/                  # List tenant members
│   │   ├── invitations/            # Invite/accept/revoke with tokens
│   │   ├── billing/                # Stripe checkout/portal/webhooks/limits
│   │   ├── websocket/              # Presence + cursor + data events
│   │   └── audit/                  # Immutable audit log
│   └── Dockerfile                  # Multi-stage, non-root
│
└── apps/web/                       # React frontend (36 source files)
    ├── src/
    │   ├── App.tsx                 # Routes + error boundaries
    │   ├── api/client.ts           # Axios + JWT auto-refresh queue
    │   ├── stores/                 # auth, timeline, toast, theme (Zustand)
    │   ├── hooks/                  # useTimeline, useWebSocket, useVirtualRows
    │   ├── pages/                  # Login, Register, GanttPage
    │   └── components/
    │       ├── common/             # Modal, ConfirmDialog, Toast, ErrorBoundary, ThemeToggle, PresenceIndicator
    │       ├── layout/             # TopBar, Sidebar
    │       └── gantt/              # GanttChart, DependencyLines, DetailDrawer, SmartSummary, ResourceView,
    │                               # CreateStoryModal, CreateFeatureModal, CreateProjectModal,
    │                               # InviteUserModal, BillingModal
    └── Dockerfile
```

---

## 4. WHAT HAS BEEN COMPLETED

### Phase 1 — Foundation ✅
- NestJS modular architecture with dependency injection
- PostgreSQL schema (13 tables) with Row-Level Security on every table
- JWT authentication with refresh token rotation (bcrypt 12 rounds)
- RBAC authorization: Owner > Admin > Manager > Member > Viewer
- Tenant middleware: extracts tenant from JWT, scopes all queries
- Global guards: JwtAuthGuard + RolesGuard + ThrottlerGuard on every route
- Full CRUD: Projects, Features, Stories, Subtasks, Dependencies
- Timeline endpoint: single optimized query returns all Gantt data
- Smart Summary: due today, overdue, starting, completed counts
- Swagger/OpenAPI docs auto-generated at /api/docs
- Docker Compose with multi-stage production Dockerfiles
- Database seed script with realistic demo data

### Phase 2 — Scale & Polish ✅
- **Virtualized Gantt chart**: binary search viewport culling, absolute positioning, ~30 DOM nodes regardless of dataset size
- **SVG dependency lines**: curved connectors with arrowheads, hover highlight
- **Drag-to-move with ghost bar**: shadow elevation, opacity change, follows cursor
- **Resize-to-adjust**: drag right edge of story bar to change duration
- **Resource/Workload view**: group by assignee, overload detection (>3 active = warning)
- **Dark mode**: light/dark/system with 16 CSS variables, ThemeToggle in TopBar
- **WebSocket real-time**: gateway with JWT auth, tenant-scoped rooms, cursor broadcasting
- **Presence indicator**: online collaborator avatars in TopBar
- **Stories broadcast**: auto-refresh Gantt on remote create/update/move/delete
- **Create modals**: Story (full form), Feature (color picker), Project
- **Invite User**: email + role selector, pending list, revoke (full-stack)
- **Delete confirmation**: dialog with cascade warning
- **Toast notifications**: success/error/warning/info with auto-dismiss
- **Error boundaries**: two-level (app + page) with retry/refresh
- **Keyboard shortcuts**: Esc (close), N (new story)
- **TopBar**: Gantt/Resources toggle, Day/Week/Month, +New dropdown, billing, theme, presence

### Phase 3 — SaaS (started) ✅
- **Stripe billing**: checkout sessions, billing portal, webhook handler (checkout.session.completed, subscription.updated/deleted, invoice.payment_failed)
- **Plan enforcement**: PlanGuard checks project/user/story limits on POST
- **Usage metering**: projects, users, stories counted against plan limits
- **Billing modal**: plan comparison cards (Free/Pro/Enterprise), usage bars, monthly/yearly toggle, Stripe checkout redirect, manage billing link
- **Plan tiers defined**: Free (3 projects, 5 users, 50 stories) → Pro (25/50/500) → Enterprise (unlimited)

---

## 5. API ENDPOINTS (34 total)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | Public | Create tenant + owner |
| POST | /auth/login | Public | Login → access + refresh tokens |
| POST | /auth/refresh | Public | Rotate refresh token |
| POST | /auth/logout | JWT | Revoke all refresh tokens |
| GET | /projects | JWT | List tenant projects |
| GET | /projects/:id | JWT | Project details + members |
| POST | /projects | JWT | Create project (plan-limited) |
| PATCH | /projects/:id | JWT | Update project |
| DELETE | /projects/:id | JWT | Delete project + cascade |
| GET | /features?projectId= | JWT | List features |
| POST | /features | JWT | Create feature |
| PATCH | /features/:id | JWT | Update feature |
| DELETE | /features/:id | JWT | Delete feature + cascade |
| GET | /stories?projectId= | JWT | List stories + subtasks |
| GET | /stories/:id | JWT | Story details |
| POST | /stories | JWT | Create story (plan-limited) |
| PATCH | /stories/:id | JWT | Update story |
| PATCH | /stories/:id/move | JWT | Move story on timeline |
| DELETE | /stories/:id | JWT | Delete story |
| GET | /subtasks?storyId= | JWT | List subtasks |
| POST | /subtasks | JWT | Create subtask |
| PATCH | /subtasks/:id | JWT | Update subtask (auto-recalcs parent) |
| DELETE | /subtasks/:id | JWT | Delete subtask |
| POST | /dependencies | JWT | Create dependency (cycle check) |
| DELETE | /dependencies/:id | JWT | Delete dependency |
| GET | /timeline?projectId= | JWT | Full Gantt data in one query |
| GET | /timeline/summary?projectId= | JWT | Smart summary counts |
| GET | /users | JWT | List tenant members |
| GET | /users/:id | JWT | User details |
| POST | /invitations | JWT+RBAC | Send invite (Owner/Admin) |
| GET | /invitations | JWT+RBAC | List invitations |
| POST | /invitations/accept | Public | Accept invite → create user |
| DELETE | /invitations/:id | JWT+RBAC | Revoke pending invite |
| GET | /billing/usage | JWT | Plan usage + limits |
| GET | /billing/subscription | JWT | Subscription details |
| POST | /billing/checkout | JWT+RBAC | Stripe checkout session |
| POST | /billing/portal | JWT+RBAC | Stripe billing portal |
| POST | /webhooks/stripe | Public | Stripe webhook handler |

---

## 6. DATABASE SCHEMA (13 tables)

tenants, users, projects, project_members, features, stories, subtasks, dependencies, audit_logs, saved_views, refresh_tokens, invitations, subscriptions

All tables have `tenant_id` + RLS policies. See `apps/api/src/database/init.sql` for full DDL.

---

## 7. SECURITY MODEL

1. **JWT Auth**: 15-min access tokens + 7-day rotating refresh tokens
2. **RBAC**: 5 roles with global guard checking @Roles() decorator
3. **Tenant isolation**: every query scoped by tenant_id + PostgreSQL RLS as defense-in-depth
4. **Rate limiting**: 20/sec, 200/min, 5000/hr
5. **Input validation**: class-validator whitelist mode (unknown fields rejected)
6. **Password hashing**: bcrypt 12 rounds
7. **HTTP security**: Helmet headers, CORS restricted
8. **Audit trail**: every mutation logged with actor, changes diff, hashed IP

---

## 8. TRACE COHERENCE SYSTEM

TRACE is installed and configured. Run `trace check` before and after any changes.

**8 Anchors:**
| Anchor | File | Consumers |
|--------|------|-----------|
| shared_types | packages/shared/src/index.ts | 7 |
| db_schema | apps/api/src/database/init.sql | 2 |
| entities | apps/api/src/database/entities.ts | 9 |
| api_client | apps/web/src/api/client.ts | 2 |
| app_module | apps/api/src/app.module.ts | 3 |
| gantt_layout | apps/web/src/components/gantt/GanttChart.tsx | 1 |
| websocket_gateway | apps/api/src/websocket/events.gateway.ts | 2 |
| spec_doc | SPEC.md | 1 |

**4 Execution Contracts:**
- `add_entity`: shared types → init.sql → entities → app.module → NestJS module → API client → hooks → SPEC.md
- `add_api_endpoint`: DTO → controller → API client → hook → SPEC.md
- `modify_schema`: init.sql → entities → shared types → seed → verify RLS
- `modify_gantt_layout`: GanttChart constants → DependencyLines constants → verify alignment

---

## 9. FUTURE ROADMAP (what to build next)

### Phase 3 Remaining — SaaS Growth
| # | Feature | Scope | Effort |
|---|---------|-------|--------|
| 1 | **Tenant Admin Console** | User management UI, role changes, org settings page, usage dashboard | Medium |
| 2 | **Public API + API Keys** | API key entity, key generation/rotation, separate auth guard for API keys, rate limiting per key | Medium |
| 3 | **Webhooks** | Webhook entity, registration UI, event delivery queue (BullMQ), retry logic, delivery logs | Medium-Large |
| 4 | **Data Export** | Export project as JSON/CSV/PDF, background job for large exports, download link via email | Small-Medium |
| 5 | **Email Notifications** | SendGrid/SES integration, invite emails, overdue alerts, daily digest | Medium |
| 6 | **SSO (SAML/OIDC)** | Enterprise-tier SSO, IdP configuration per tenant, JIT user provisioning | Large |

### Phase 4 — Growth & Enterprise
| # | Feature | Scope |
|---|---------|-------|
| 7 | Onboarding flow | First-run experience, sample project creation, tooltips |
| 8 | Mobile responsive | Responsive breakpoints, touch-friendly Gantt interactions |
| 9 | Canvas renderer | Replace DOM Gantt with HTML5 Canvas for 5000+ story performance |
| 10 | Custom fields | Tenant-defined fields on stories (text, number, date, select) |
| 11 | Time tracking | Log hours against stories, timesheet view |
| 12 | Reporting dashboard | Velocity charts, burndown, completion trends |
| 13 | Multi-language (i18n) | Internationalization framework, translation files |
| 14 | Slack/Teams integration | Bot for notifications, slash commands for quick actions |
| 15 | GitHub/GitLab integration | Link stories to PRs/commits, auto-status updates |

---

## 10. ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL=postgresql://planview:planview_dev_secret_2026@localhost:5432/planview
DB_PASSWORD=planview_dev_secret_2026

# Redis
REDIS_URL=redis://:planview_redis_dev@localhost:6379
REDIS_PASSWORD=planview_redis_dev

# JWT (CHANGE IN PRODUCTION — use `openssl rand -hex 64`)
JWT_SECRET=planview_jwt_dev_secret_change_in_production
JWT_REFRESH_SECRET=planview_refresh_dev_secret_change_in_production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000

# Stripe (add for billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 11. DEV CREDENTIALS

| Email | Password | Role |
|-------|----------|------|
| arjun@acme.com | password123 | Owner |
| sarah@acme.com | password123 | Admin |
| david@acme.com | password123 | Member |
| priya@acme.com | password123 | Member |
| liam@acme.com | password123 | Member |

---

## 12. COMMANDS

```bash
# Run
docker compose up -d
docker compose exec api npm run seed

# Verify coherence
trace check

# Swagger docs
http://localhost:4000/api/docs

# Stop
docker compose down

# Fresh start (wipe data)
docker compose down -v
```
