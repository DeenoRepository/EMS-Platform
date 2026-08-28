# ------------------------------------------------------------------------------
# 1. Build stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY docker/jira/package.json ./
RUN npm install typescript @types/node

COPY docker/jira/server.ts ./
RUN npx tsc server.ts --target ES2022 --module commonjs --skipLibCheck --outDir ./dist

# ------------------------------------------------------------------------------
# 2. Production runtime stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV TEMP_DIR=/app/temp

# Copy compiled JavaScript
COPY --from=builder /app/dist/server.js ./server.js
RUN mkdir -p /app/temp

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "server.js"]
