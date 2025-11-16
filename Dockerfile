# syntax=docker/dockerfile:1
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine AS builder
WORKDIR /app
COPY . .
ARG TARGETARCH
ARG TARGETOS
ARG SKIP_LINT=false
ENV NEXT_LINT=${SKIP_LINT}
RUN npm install --os=${TARGETOS} --cpu=${TARGETARCH}
RUN npm rebuild
RUN npm install --no-save --platform=linux --arch=x64 lightningcss
RUN npm install --no-save --platform=linux --arch=arm64 lightningcss
RUN npm rebuild lightningcss
RUN npm install --no-save --platform=linux --arch=x64 sharp
RUN npm install --no-save --platform=linux --arch=arm64 sharp
RUN npm rebuild sharp
RUN npm run build || (npm install --os=${TARGETOS} --cpu=${TARGETARCH} lightningcss && npm run build)
    

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
