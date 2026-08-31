# ==============================================================================
# EMS Platform — Production Multi-Stage Dockerfile
# ==============================================================================

# 1. Base Layer with pnpm
# Версия Node.js должна совпадать с .nvmrc и node-version-file в CI:
# тесты, coverage и build верифицируются именно на этой мажорной версии,
# поэтому production-образ не должен исполняться на другой.
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.16.0 --activate
WORKDIR /app

# 2. Dependencies Layer (Optimized caching)
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# 3. Build Layer
FROM base AS builder
WORKDIR /app

COPY --from=deps /app ./
COPY . .

# Generate Prisma Client & Build Monorepo
RUN pnpm --filter @ems/database generate
RUN pnpm build

# 4. Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_DIR=/app/uploads

# Create directories and set proper ownership
RUN mkdir -p /app/uploads && chown -R node:node /app

# Copy built application
COPY --from=builder --chown=node:node /app ./

# Run container as non-root user
USER node

EXPOSE 3000

# Healthcheck for orchestration
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/system/health || exit 1

# Apply versioned database migrations (not db push --accept-data-loss), then
# start Next.js. `migrate deploy` is a safe no-op if migrations are already
# applied; see plans/done/2026-08/L2-prisma-migration-baseline.md. On a
# volume from a pre-L2 db-push-based install it fails with Prisma P3005
# instead of altering data — baseline that database first per
# docs/operations/PRODUCTION_DEPLOYMENT.md.
#
# The failure must NOT be swallowed: starting Next.js against an unmigrated
# schema yields a green healthcheck hiding a schema/code mismatch. `&&` stops
# the container so the Prisma error is the last thing in `docker logs`.
CMD ["sh", "-c", "pnpm --filter @ems/database exec prisma migrate deploy && pnpm --filter @ems/web start"]
