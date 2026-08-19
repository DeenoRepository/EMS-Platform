FROM node:22-alpine AS base
RUN npm install -g pnpm

# 1. Builder
FROM base AS builder
WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ems/database generate
RUN pnpm build

# 2. Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app ./

EXPOSE 3000

CMD ["pnpm", "--filter", "@ems/web", "start"]

