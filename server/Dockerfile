# ---- Stage 1: build TypeScript ------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests first so `npm ci` is cached until dependencies actually change.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci --workspace=server --include-workspace-root

COPY server ./server
RUN npm run build --workspace=server


# ---- Stage 2: production dependencies only ------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci --workspace=server --include-workspace-root --omit=dev --omit=optional \
    && npm cache clean --force


# ---- Stage 3: runtime ---------------------------------------------------------
FROM node:22-alpine AS runtime

# dumb-init reaps zombies and forwards SIGTERM so graceful shutdown works.
RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production \
    PORT=4000 \
    NODE_OPTIONS="--max-old-space-size=768"

WORKDIR /app

COPY --from=deps  --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/server/dist ./dist
COPY --chown=node:node server/package.json ./package.json

RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Never run as root.
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:4000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
