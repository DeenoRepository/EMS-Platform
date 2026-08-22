# ==============================================================================
# EMS Platform — Production Multi-Stage Dockerfile
# ==============================================================================

# 1. Base Layer with pnpm
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
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
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/setup/status || exit 1

# Run migrations then start app
CMD ["sh", "-c", "pnpm --filter @ems/database migrate:deploy && pnpm --filter @ems/web start"]
