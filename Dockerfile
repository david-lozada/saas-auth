# Dockerfile
# ==========================================
# Stage 1: Dependencies & Build
# ==========================================
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json pnpm-lock.yaml ./
COPY .npmrc ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:22-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune && \
    rm -rf /root/.local/share/pnpm/store

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Switch to non-root user
USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["node", "dist/main"]