# syntax=docker/dockerfile:1
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Use npm install instead of npm ci for more flexibility with missing optional deps
RUN npm install --only=production --ignore-scripts
# Clean up any dev dependencies that might have been installed
RUN npm prune --omit=dev

FROM node:24 AS builder
WORKDIR /app
COPY . .
ARG TARGETARCH
ARG TARGETOS
RUN npm install --os=${TARGETOS} --cpu=${TARGETARCH}
RUN npm rebuild
RUN npm install --no-save --platform=linux --arch=x64 lightningcss
RUN npm install --no-save --platform=linux --arch=arm64 lightningcss
RUN npm rebuild lightningcss
RUN npm install --no-save --platform=linux --arch=x64 sharp
RUN npm install --no-save --platform=linux --arch=arm64 sharp
RUN npm rebuild sharp
RUN npm run build || (npm install --os=${TARGETOS} --cpu=${TARGETARCH} lightningcss && npm run build)
    

FROM node:24 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src
EXPOSE 3000
CMD ["npm", "run", "start"]