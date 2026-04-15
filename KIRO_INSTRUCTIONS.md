# PlanView — Amazon Kiro Setup Guide

## Quick Start in Kiro

### 1. Open the project
Open the `planview/` directory in Kiro.

### 2. Give Kiro context
When starting a session, point Kiro to these files (in this order):

```
@SPEC.md
@trace.yaml
@packages/shared/src/index.ts
@apps/api/src/app.module.ts
@apps/api/src/database/init.sql
@HANDOFF_DOCUMENT.md
```

This gives Kiro the full project context: what the app does, the tech stack, all TypeScript interfaces, how the backend is wired, the database schema, and what's been built vs what's pending.

### 3. Verify coherence
Ask Kiro to run:
```
trace check
```
Should show 12/12 PASS. If any failures, fix them before starting new work.

### 4. Start building
Tell Kiro: "Read HANDOFF_DOCUMENT.md section 9 for the roadmap. Let's build item #1: Tenant Admin Console."

---

## How TRACE Works with Kiro

TRACE enforces structural coherence. Before building anything, Kiro should:

1. **Check `trace.yaml`** for the relevant execution contract
2. **Follow the contract steps** in order
3. **Run `trace check`** after completing changes to verify no drift

### Example: Adding a new entity

Kiro reads the `add_entity` contract from `trace.yaml`:
1. Update `packages/shared/src/index.ts` with the new interface
2. Add table to `apps/api/src/database/init.sql`
3. Add entity to `apps/api/src/database/entities.ts`
4. Register entity in `apps/api/src/app.module.ts`
5. Create NestJS module (controller + service)
6. Add API functions to `apps/web/src/api/client.ts`
7. Add React Query hooks to `apps/web/src/hooks/useTimeline.ts`
8. Update `SPEC.md` API table

### Example: Adding a new API endpoint

Kiro reads the `add_api_endpoint` contract:
1. Define DTO with class-validator decorators
2. Add controller method with Swagger decorators
3. Add matching function in `apps/web/src/api/client.ts`
4. Add React Query hook if needed
5. Update `SPEC.md` API table

---

## Key Architecture Patterns

When Kiro generates code, it should follow these established patterns:

### Backend service pattern
```typescript
@Injectable()
export class XxxService {
  constructor(
    @InjectRepository(XxxEntity) private readonly repo: Repository<XxxEntity>,
  ) {}

  async findAll(tenantId: string) {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async create(tenantId: string, dto: CreateXxxDto) {
    const entity = this.repo.create({ ...dto, tenantId });
    return this.repo.save(entity);
  }
}
```

### Backend controller pattern
```typescript
@ApiTags('Xxx')
@ApiBearerAuth()
@Controller('xxx')
export class XxxController {
  constructor(private readonly service: XxxService) {}

  @Get()
  async findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  async create(@TenantId() tenantId: string, @Body() dto: CreateXxxDto) {
    return this.service.create(tenantId, dto);
  }
}
```

### Frontend API client pattern
```typescript
export const xxxApi = {
  list: () => api.get('/xxx').then((r) => r.data),
  create: (data: any) => api.post('/xxx', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/xxx/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/xxx/${id}`).then((r) => r.data),
};
```

### React Query hook pattern
```typescript
export function useCreateXxx() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: xxxApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['relevant-key'] }),
  });
}
```

### Every new DB table must have:
- `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- RLS enabled: `ALTER TABLE xxx ENABLE ROW LEVEL SECURITY;`
- RLS policy: `CREATE POLICY tenant_isolation_xxx ON xxx USING (tenant_id::text = current_setting('app.current_tenant', TRUE))`
- If it has `updated_at`: add trigger `CREATE TRIGGER trg_xxx_updated_at BEFORE UPDATE ON xxx FOR EACH ROW EXECUTE FUNCTION update_updated_at();`

---

## Session Workflow

Every Kiro session should follow this flow:

1. `trace check` — verify clean baseline
2. Declare scope — what are you building, what anchors are affected
3. Build — follow the relevant TRACE contract
4. `trace check` — verify coherence after changes
5. Update `HANDOFF_DOCUMENT.md` — record what was built, what's pending
6. Update `SPEC.md` — if new endpoints or structural changes

---

## What NOT to Do

- Never use `synchronize: true` in TypeORM (use migrations or init.sql)
- Never skip `tenant_id` on a new table
- Never add a route without Swagger decorators
- Never create a frontend mutation without toast feedback
- Never modify GanttChart row heights without updating DependencyLines
- Never add a dependency without checking `package.json` against the TRACE dependency policy
