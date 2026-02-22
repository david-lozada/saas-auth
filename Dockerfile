# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
# Install all deps (including dev) for build
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Production stage - minimal image
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy only production dependencies
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune && \
    rm -rf /root/.local/share/pnpm/store

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Security hardening
RUN apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

ENV NODE_ENV=production
ENV PORT=3000

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["dumb-init", "node", "dist/main"]