-- ═══════════════════════════════════════════════════════════════
-- PlanView — Database Initialization
-- Multi-tenant schema with Row-Level Security
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── TENANTS ────────────────────────────────────────────────────
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    plan_tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'enterprise')),
    settings JSONB NOT NULL DEFAULT '{
        "maxProjects": 3,
        "maxUsersPerProject": 10,
        "features": {
            "dependencies": true,
            "resourceView": false,
            "customFields": false,
            "apiAccess": false
        }
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

-- ─── USERS ──────────────────────────────────────────────────────
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
    initials VARCHAR(5) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    refresh_token_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(tenant_id, email);

-- ─── PROJECTS ───────────────────────────────────────────────────
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_status ON projects(tenant_id, status);

-- ─── PROJECT MEMBERS ────────────────────────────────────────────
CREATE TABLE project_members (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_tenant ON project_members(tenant_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- ─── FEATURES ───────────────────────────────────────────────────
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_features_project ON features(tenant_id, project_id, sort_order);

-- ─── STORIES ────────────────────────────────────────────────────
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'done', 'delayed')),
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_story_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_stories_project ON stories(tenant_id, project_id, start_date, end_date);
CREATE INDEX idx_stories_assignee ON stories(tenant_id, assignee_id, start_date);
CREATE INDEX idx_stories_feature ON stories(tenant_id, feature_id, sort_order);
CREATE INDEX idx_stories_status ON stories(tenant_id, status);

-- ─── SUBTASKS ───────────────────────────────────────────────────
CREATE TABLE subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'done')),
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subtasks_story ON subtasks(tenant_id, story_id, sort_order);

-- ─── DEPENDENCIES ───────────────────────────────────────────────
CREATE TABLE dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    from_story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    to_story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    type VARCHAR(2) NOT NULL DEFAULT 'FS' CHECK (type IN ('FS', 'FF', 'SS', 'SF')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(from_story_id, to_story_id),
    CONSTRAINT chk_no_self_dependency CHECK (from_story_id != to_story_id)
);

CREATE INDEX idx_dependencies_tenant ON dependencies(tenant_id);
CREATE INDEX idx_dependencies_from ON dependencies(from_story_id);
CREATE INDEX idx_dependencies_to ON dependencies(to_story_id);

-- ─── AUDIT LOGS ─────────────────────────────────────────────────
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT')),
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_time ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(tenant_id, resource_type, resource_id);

-- ─── SAVED VIEWS ────────────────────────────────────────────────
CREATE TABLE saved_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    grouping VARCHAR(20) NOT NULL DEFAULT 'feature' CHECK (grouping IN ('feature', 'assignee', 'status')),
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_views_user ON saved_views(tenant_id, user_id);

-- ─── REFRESH TOKENS ─────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ─── INVITATIONS ────────────────────────────────────────────────
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    invited_by UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_tenant ON invitations(tenant_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(tenant_id, email);

-- ─── SUBSCRIPTIONS ──────────────────────────────────────────────
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    payment_provider VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (payment_provider IN ('none', 'stripe', 'razorpay')),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    razorpay_customer_id VARCHAR(255),
    razorpay_subscription_id VARCHAR(255),
    razorpay_plan_id VARCHAR(255),
    plan_tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'enterprise')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_razorpay ON subscriptions(razorpay_customer_id);

-- ─── INTEGRATIONS ───────────────────────────────────────────────
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('jira', 'gitlab', 'slack', 'teams', 'google_chat')),
    base_url VARCHAR(500) NOT NULL,
    api_token_encrypted TEXT NOT NULL DEFAULT '',
    username VARCHAR(255),
    project_key VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, provider)
);

CREATE INDEX idx_integrations_tenant ON integrations(tenant_id);

-- ─── STORY LINKS (links PlanView stories to external issues/MRs) ──
CREATE TABLE story_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('jira', 'gitlab')),
    link_type VARCHAR(20) NOT NULL DEFAULT 'issue' CHECK (link_type IN ('issue', 'merge_request', 'branch')),
    external_id VARCHAR(255) NOT NULL,
    external_key VARCHAR(255),
    external_url VARCHAR(500),
    external_status VARCHAR(100),
    title VARCHAR(500),
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(story_id, provider, external_id)
);

CREATE INDEX idx_story_links_story ON story_links(story_id);
CREATE INDEX idx_story_links_tenant ON story_links(tenant_id);

-- ═══════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Defense-in-depth: even if app code has a bug, data can't leak
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_links ENABLE ROW LEVEL SECURITY;

-- Create app user (the NestJS app connects as this role)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'planview_app') THEN
        CREATE ROLE planview_app LOGIN PASSWORD 'planview_app_secret';
    END IF;
END
$$;

-- Grant permissions to app user
GRANT USAGE ON SCHEMA public TO planview_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO planview_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO planview_app;

-- RLS policies: app sets current_setting('app.current_tenant') per request
-- Each policy ensures queries only return rows for the current tenant

CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_projects ON projects
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_project_members ON project_members
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_features ON features
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_stories ON stories
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_subtasks ON subtasks
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_dependencies ON dependencies
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_saved_views ON saved_views
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_refresh_tokens ON refresh_tokens
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_invitations ON invitations
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_subscriptions ON subscriptions
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_integrations ON integrations
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation_story_links ON story_links
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- The superuser (planview) bypasses RLS for migrations and admin tasks
-- The app user (planview_app) is subject to RLS

-- ─── AUTO-UPDATE TIMESTAMPS ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_features_updated_at BEFORE UPDATE ON features FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stories_updated_at BEFORE UPDATE ON stories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subtasks_updated_at BEFORE UPDATE ON subtasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_saved_views_updated_at BEFORE UPDATE ON saved_views FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
