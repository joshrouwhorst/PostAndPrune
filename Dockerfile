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
COPY . .
ARG SKIP_LINT=false
ENV NEXT_LINT=${SKIP_LINT}
# Install all dependencies including dev dependencies for building
RUN npm install --ignore-scripts
# Try to rebuild platform-specific packages, but don't fail if they're not available
RUN npm rebuild || true
RUN npm run build
    

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install TypeScript and ts-node for running TypeScript files
RUN npm install -g typescript ts-node

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/start.ts ./start.ts
EXPOSE 3000
CMD ["ts-node", "./start.ts"]
