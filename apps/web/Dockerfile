# ─── Build Stage ───
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace=@planview/web --workspace=@planview/shared --include-workspace-root

COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

ARG VITE_API_URL=https://planview-api.onrender.com
ARG VITE_WS_URL=wss://planview-api.onrender.com
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

RUN cd apps/web && npx vite build

# ─── Production Stage ───
FROM nginx:1.25-alpine

COPY --from=builder /app/apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

ENV PORT=10000
EXPOSE 10000

CMD ["nginx", "-g", "daemon off;"]
