# PlanView Deployment Guide

## Option 1: Render.com (Free — Recommended for starting out)

Everything on one platform, zero cost.

### One-Click Deploy:

1. Push your code to GitHub
2. Go to [render.com/blueprints](https://render.com/blueprints)
3. Click "New Blueprint Instance"
4. Select your GitHub repo
5. Render reads `render.yaml` and creates all 3 services automatically:
   - `planview-db` — PostgreSQL 16 (free)
   - `planview-api` — NestJS Docker service (free)
   - `planview-web` — Static React site (free)
6. Click "Apply" and wait ~5 minutes for everything to build

### After deploy — initialize the database:

Render's free PostgreSQL doesn't run init scripts automatically. You need to run the schema once:

```bash
# Get your DATABASE_URL from Render Dashboard → planview-db → Info → External URL
export DATABASE_URL="postgresql://planview:xxxxx@xxxx.render.com:5432/planview"

# Run the schema
psql $DATABASE_URL < apps/api/src/database/init.sql

# Optionally seed demo data
cd apps/api && DATABASE_URL=$DATABASE_URL npx ts-node src/database/seed.ts
```

Or use the Render Dashboard → planview-db → "Shell" tab and paste the contents of `init.sql`.

### Update URLs after deploy:

Once deployed, Render gives you URLs like:
- API: `https://planview-api-xxxx.onrender.com`
- Web: `https://planview-web-xxxx.onrender.com`

Go to Render Dashboard and update these env vars:
- On `planview-api`: set `CORS_ORIGIN` to your actual web URL
- On `planview-api`: set `APP_URL` to your actual web URL
- On `planview-web`: set `VITE_API_URL` and `VITE_WS_URL` to your actual API URL
- Redeploy both services after changing env vars

### Free tier limitations:
- API sleeps after 15 min of inactivity (cold start ~30s)
- PostgreSQL: 256MB storage, expires after 90 days (re-create or upgrade)
- No Redis on free tier (WebSocket presence and caching won't work, but core app functions fine)
- 750 hours/month of compute

### Custom domain:
Render Dashboard → your service → Settings → Custom Domains

---

## Option 2: Netlify + Railway (Paid — ~$5-10/mo)

1. Go to [railway.app](https://railway.app) and create a new project
2. Add a **PostgreSQL** service (click "+ New" → "Database" → "PostgreSQL")
3. Add a **Redis** service (click "+ New" → "Database" → "Redis")
4. Add your **API** service (click "+ New" → "GitHub Repo" → select your repo)
5. Railway will detect the `railway.toml` and use the Dockerfile

### Set environment variables on the API service:

```
DATABASE_URL        → copy from Railway PostgreSQL service
REDIS_URL           → copy from Railway Redis service
JWT_SECRET          → generate with: openssl rand -hex 64
JWT_REFRESH_SECRET  → generate with: openssl rand -hex 64
NODE_ENV            → production
PORT                → 4000
CORS_ORIGIN         → https://your-site.netlify.app
RAZORPAY_KEY_ID     → from Razorpay dashboard
RAZORPAY_KEY_SECRET → from Razorpay dashboard
EMAIL_PROVIDER      → sendgrid
SENDGRID_API_KEY    → from SendGrid dashboard
APP_URL             → https://your-site.netlify.app
```

### Initialize the database:

After PostgreSQL is running, open the Railway PostgreSQL service, go to "Data" tab, and run the contents of `apps/api/src/database/init.sql` in the query editor.

Or connect via CLI:
```bash
psql $DATABASE_URL < apps/api/src/database/init.sql
```

### Note your API URL:
Railway gives you a URL like `https://planview-api-production.up.railway.app`. You'll need this for the frontend.

---

## Step 2: Deploy Frontend on Netlify

1. Go to [netlify.com](https://app.netlify.com) and click "Add new site" → "Import from Git"
2. Select your repo
3. Netlify will detect `apps/web/netlify.toml` automatically
4. If it doesn't auto-detect, set:
   - **Base directory**: `apps/web`
   - **Build command**: `cd ../.. && npm ci && cd apps/web && npx vite build`
   - **Publish directory**: `apps/web/dist`

### Set environment variables in Netlify Dashboard:

```
VITE_API_URL  → https://your-api.railway.app  (your Railway API URL)
VITE_WS_URL   → wss://your-api.railway.app
```

5. Click "Deploy site"

---

## Step 3: Post-Deployment

### Update CORS:
Go back to Railway and update `CORS_ORIGIN` to your actual Netlify URL (e.g., `https://planview.netlify.app`).

### Custom domain (optional):
- Netlify: Site Settings → Domain Management → Add custom domain
- Railway: Settings → Networking → Custom Domain
- Update `CORS_ORIGIN`, `APP_URL`, `VITE_API_URL` accordingly

### Seed demo data (optional):
```bash
# Set DATABASE_URL to your Railway PostgreSQL URL
export DATABASE_URL="postgresql://..."
cd apps/api && npx ts-node src/database/seed.ts
```

---

## Costs (approximate)

| Service | Free Tier | Paid |
|---------|-----------|------|
| Netlify (frontend) | 100GB bandwidth/mo | $19/mo Pro |
| Railway (API + DB + Redis) | $5 trial credit | ~$5-15/mo |
| SendGrid (email) | 100 emails/day free | $15/mo |
| Razorpay | No monthly fee | 2% per transaction |

Total to start: **~$5-10/month**

---

## Monitoring

- **Health check**: `GET https://your-api.railway.app/api/v1/health`
- **API docs**: `https://your-api.railway.app/api/docs` (disabled in production by default)
- **Railway logs**: Railway Dashboard → your service → "Logs" tab
- **Netlify deploys**: Netlify Dashboard → "Deploys" tab
