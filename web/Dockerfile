# ---- Stage 1: build the static bundle -----------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY web/package.json ./web/
RUN npm ci --workspace=web --include-workspace-root

COPY web ./web

# Baked in at build time — points the SPA at the public API origin.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --workspace=web


# ---- Stage 2: serve with nginx -------------------------------------------------
FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache curl

COPY --from=builder /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY web/nginx-snippets/ /etc/nginx/snippets/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -fsS http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
