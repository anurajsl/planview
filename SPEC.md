# PlanView — Project Specification
# For use with Amazon Kiro, Cursor, Windsurf, or any AI-assisted IDE

## WHAT IS THIS

PlanView is a Gantt-first project management SaaS application. The primary interface is a full-width interactive timeline where story bars represent work items, grouped by features. It's built for multi-tenant deployment with Row-Level Security in PostgreSQL.

## TECH STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend framework | NestJS | 10.x |
| Backend language | TypeScript | 5.4+ |
| Database | PostgreSQL | 16 |
| ORM | TypeORM | 0.3.x |
| Cache | Redis | 7 |
| Auth | Custom JWT (Passport) | - |
| Frontend framework | React | 18.3 |
| Frontend build | Vite | 5.x |
| State (UI) | Zustand | 4.5 |
| State (server) | TanStack React Query | 5.x |
| CSS | Tailwind CSS | 3.4 |
| HTTP client | Axios | 1.6 |
| Validation | class-validator + class-transformer | - |
| API docs | Swagger (auto-generated) | - |
| Containerization | Docker + Docker Compose | - |
| Monorepo | npm workspaces | - |

## PROJECT STRUCTURE

```
planview/
├── package.json                    # Monorepo root (npm workspaces)
├── docker-compose.yml              # PostgreSQL 16 + Redis 7 + API + Web
├── .env.example                    # Environment variables template
├── .gitignore
├── README.md
│
├── packages/shared/                # @planview/shared — TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── src/index.ts                # ALL entity interfaces, enums, API contracts
│
├── apps/api/                       # @planview/api — NestJS backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── Dockerfile                  # Multi-stage, non-root production build
│   └── src/
│       ├── main.ts                 # Bootstrap: Helmet, CORS, ValidationPipe, Swagger
│       ├── app.module.ts           # Root module: global guards, tenant middleware, DB
│       ├── auth/                   # JWT auth (register, login, refresh, logout)
│       │   ├── auth.module.ts
│       │   ├── auth.service.ts     # Bcrypt 12 rounds, refresh token rotation
│       │   ├── auth.controller.ts  # POST /auth/register, /login, /refresh, /logout
│       │   ├── jwt.strategy.ts     # Passport JWT validation
│       │   └── dto/auth.dto.ts     # Validated request DTOs
│       ├── common/
│       │   ├── decorators/index.ts # @CurrentUser, @TenantId, @Public, @Roles
│       │   ├── guards/jwt-auth.guard.ts  # Global: all routes need JWT unless @Public
│       │   ├── guards/roles.guard.ts     # RBAC: @Roles('admin','owner')
│       │   └── middleware/tenant.middleware.ts  # Decodes JWT, sets tenant context
│       ├── database/
│       │   ├── entities.ts         # 11 TypeORM entities (Tenant, User, Project, etc.)
│       │   ├── init.sql            # Full DDL + RLS policies + triggers
│       │   └── seed.ts             # Demo data loader
│       ├── projects/               # CRUD controller + service
│       ├── features/               # CRUD controller + service
│       ├── stories/                # CRUD + move endpoint + DTOs
│       ├── subtasks/               # CRUD + auto progress recalc
│       ├── dependencies/           # Create/delete + cycle detection
│       ├── timeline/               # GET /timeline (optimized Gantt query) + GET /summary
│       ├── users/                  # GET /users (list tenant members)
│       ├── audit/                  # Immutable audit log service
│       └── tenants/                # Tenant entity module
│
└── apps/web/                       # @planview/web — React frontend
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts              # Path aliases + API proxy
    ├── tailwind.config.js          # Custom design tokens
    ├── postcss.config.js
    ├── index.html
    ├── Dockerfile
    └── src/
        ├── main.tsx                # QueryClient + BrowserRouter
        ├── App.tsx                 # Routes: /login, /register, /* (protected)
        ├── index.css               # Tailwind + scrollbar + transitions
        ├── api/client.ts           # Axios with JWT interceptor + auto-refresh queue
        ├── stores/
        │   ├── auth.store.ts       # Zustand: login, register, logout, hydrate
        │   └── timeline.store.ts   # Zustand: viewMode, filters, selection, UI toggles
        ├── hooks/useTimeline.ts    # React Query hooks + optimistic updates
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   └── GanttPage.tsx       # Main page: wires all components + modals
        └── components/
            ├── common/
            │   ├── Modal.tsx              # Reusable modal
            │   ├── ConfirmDialog.tsx       # Delete confirmations
            │   ├── ToastContainer.tsx      # Floating notifications
            │   ├── ErrorBoundary.tsx       # Crash recovery with retry
            │   ├── PresenceIndicator.tsx   # Online user avatars
            │   └── ThemeToggle.tsx         # Dark mode switcher
            ├── layout/
            │   ├── TopBar.tsx             # Brand, project, view, search, +New, presence, theme
            │   └── Sidebar.tsx            # Feature/story tree + Add Feature
            └── gantt/
                ├── GanttChart.tsx          # Timeline: bars, grid, today-line, drag/resize
                ├── DependencyLines.tsx     # SVG connectors between stories
                ├── DetailDrawer.tsx        # Right panel: edit, subtasks, deps, delete
                ├── SmartSummary.tsx        # Floating pulse panel
                ├── CreateStoryModal.tsx    # Create story form
                ├── CreateFeatureModal.tsx  # Create feature + color picker
                ├── CreateProjectModal.tsx  # Create project form
                └── InviteUserModal.tsx     # Invite + pending list + revoke
```

## API ENDPOINTS

All routes prefixed with `/api/v1/`. All require JWT Bearer token except auth and invite-accept routes.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | Public | Create tenant + owner user |
| POST | /auth/login | Public | Login, returns access + refresh tokens |
| POST | /auth/refresh | Public | Rotate refresh token |
| POST | /auth/logout | JWT | Revoke refresh tokens |
| GET | /projects | JWT | List projects in tenant |
| GET | /projects/:id | JWT | Project details with members |
| POST | /projects | JWT | Create project |
| PATCH | /projects/:id | JWT | Update project |
| DELETE | /projects/:id | JWT | Delete project |
| GET | /features?projectId= | JWT | List features |
| POST | /features | JWT | Create feature |
| PATCH | /features/:id | JWT | Update feature |
| DELETE | /features/:id | JWT | Delete feature |
| GET | /stories?projectId= | JWT | List stories with subtasks |
| GET | /stories/:id | JWT | Story details |
| POST | /stories | JWT | Create story |
| PATCH | /stories/:id | JWT | Update story fields |
| PATCH | /stories/:id/move | JWT | Move story (drag on Gantt) |
| DELETE | /stories/:id | JWT | Delete story |
| GET | /subtasks?storyId= | JWT | List subtasks |
| POST | /subtasks | JWT | Create subtask |
| PATCH | /subtasks/:id | JWT | Update subtask (auto-recalcs parent) |
| DELETE | /subtasks/:id | JWT | Delete subtask |
| POST | /dependencies | JWT | Create dependency (with cycle check) |
| DELETE | /dependencies/:id | JWT | Delete dependency |
| GET | /timeline?projectId= | JWT | Full Gantt data (features+stories+subtasks+deps+members) |
| GET | /timeline/summary?projectId= | JWT | Smart summary (due/overdue/starting/done counts) |
| GET | /users | JWT | List users in tenant |
| GET | /users/:id | JWT | User details |
| POST | /invitations | JWT+RBAC | Send invitation (Owner/Admin) |
| GET | /invitations | JWT+RBAC | List invitations (Owner/Admin) |
| POST | /invitations/accept | Public | Accept invitation (creates user) |
| DELETE | /invitations/:id | JWT+RBAC | Revoke pending invitation |

## DATABASE SCHEMA

12 tables, all with `tenant_id` column. Row-Level Security enforced. See `apps/api/src/database/init.sql` for full DDL.

Core tables: tenants, users, projects, project_members, features, stories, subtasks, dependencies, audit_logs, saved_views, refresh_tokens, invitations.

## SECURITY MODEL

1. **Authentication:** Custom JWT with 15-min access tokens + 7-day rotating refresh tokens. Bcrypt 12 rounds.
2. **Authorization:** RBAC with roles: owner > admin > manager > member > viewer. Global guard checks @Roles().
3. **Tenant isolation:** Every query scoped by tenant_id. PostgreSQL RLS as defense-in-depth.
4. **Rate limiting:** 20/sec, 200/min, 5000/hr per client.
5. **Input validation:** class-validator whitelist mode (unknown fields rejected).
6. **HTTP security:** Helmet headers, CORS restricted to frontend origin.
7. **Audit:** Every mutation logged with actor, changes diff, hashed IP.

## DESIGN TOKENS

- Primary: #1e3a5f (deep navy)
- Accent: #3b82f6 (bright blue)
- Status active: #3b82f6, done: #22c55e, delayed: #ef4444, planned: #94a3b8
- Background: #f5f6f8
- Surface: #ffffff
- Sidebar: #0f172a (dark slate)
- Font: DM Sans (Google Fonts)
- Border radius: 6-8px
- Shadows: subtle (0 1px 3px rgba(0,0,0,0.08))

## SETUP COMMANDS

```bash
cp .env.example .env
docker compose up -d
docker compose exec api npm run seed
# Open http://localhost:5173
# Login: arjun@acme.com / password123
```

## WHAT IS COMPLETE

### Backend (42 source files)
- NestJS with 12 feature modules + global guards
- PostgreSQL 16 schema (12 tables) with Row-Level Security
- JWT auth with refresh token rotation (bcrypt 12 rounds)
- RBAC (Owner/Admin/Manager/Member/Viewer)
- Tenant middleware (JWT decode → tenant context per request)
- CRUD: Projects, Features, Stories, Subtasks, Dependencies
- Timeline endpoint (optimized single query) + Smart Summary
- WebSocket gateway (presence, cursor, data events)
- Invitations (invite, accept, revoke with secure tokens)
- Audit logging, Swagger docs, database seed script

### Frontend (32 source files)
- React 18 + Vite + Tailwind + Zustand + React Query
- Auth flow (login, register, protected routes, JWT auto-refresh)
- Gantt chart (Day/Week/Month, drag-move with ghost bar, resize)
- SVG dependency lines with hover highlight
- Detail drawer (inline edit, status, subtasks, deps, delete button)
- Smart Summary floating panel
- Create Story / Feature / Project modals
- Invite User modal (email, role, pending list, revoke)
- Delete confirmation dialog
- Toast notification system (success/error/warning/info)
- Dark mode (light/dark/system with ThemeToggle)
- Error boundaries (two-level with retry + refresh)
- Keyboard shortcuts (Esc, N)
- WebSocket real-time updates + presence indicator
- TopBar + New dropdown (Story/Feature/Project/Invite)

### Infrastructure
- Docker Compose (PostgreSQL 16 + Redis 7 + API + Web)
- Multi-stage Dockerfiles (non-root production)
- Shared types package (@planview/shared)
- TRACE coherence (8 anchors, 12/12 pass)

## WHAT IS PENDING (in priority order)

1. Canvas-based Gantt renderer (1000+ stories at 60fps)
2. Virtual scrolling (only render visible rows)
3. Web Workers for layout computation
4. Resource/workload view (group by assignee)
5. Cursor indicators on Gantt bars (show who's viewing what)
6. Stripe billing (Free/Pro/Enterprise)
7. Tenant admin console
8. SSO (SAML/OIDC)
9. Public API + API keys + webhooks
10. Data export (JSON/CSV/PDF)
11. Email notifications
