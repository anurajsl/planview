# ─── Build Stage ───
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace=@planview/api --workspace=@planview/shared --include-workspace-root

COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/
RUN cd apps/api && npx nest build

# ─── Production Stage ───
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S planview && adduser -S planview -u 1001
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace=@planview/api --workspace=@planview/shared --include-workspace-root --omit=dev

COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/shared/src packages/shared/src

USER planview
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health/ready || exit 1

CMD ["node", "apps/api/dist/main"]
