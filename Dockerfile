# syntax=docker/dockerfile:1
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Use npm install instead of npm ci for more flexibility with missing optional deps
RUN npm install --only=production --ignore-scripts
# Clean up any dev dependencies that might have been installed
RUN npm prune --omit=dev

FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# Install dependencies first
RUN npm install --ignore-scripts
COPY . .
ARG SKIP_LINT=false
ENV NEXT_LINT=${SKIP_LINT}
# Try to rebuild platform-specific packages, but don't fail if they're not available
RUN npm rebuild || true
RUN npm run build
    

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install curl for health checks
# Alternative: Use wget (already available in Alpine) for health checks instead of curl
# This avoids the busybox trigger issue in multi-platform builds
RUN apk add --no-cache --update ca-certificates curl && \
    rm -rf /var/cache/apk/* /tmp/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src ./src

EXPOSE 3000

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl --fail http://localhost:3000/api/util?action=healthcheck || exit 1

# Start Next.js application
CMD ["npm", "start"]
