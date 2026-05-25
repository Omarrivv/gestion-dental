FROM node:20-alpine AS builder
WORKDIR /app

# Use npm workspaces
COPY package.json package-lock.json ./
COPY packages/shared-kernel/package.json ./packages/shared-kernel/
COPY packages/contracts/package.json ./packages/contracts/
COPY services/identity-service/package.json ./services/identity-service/

# Install all dependencies for the monorepo
RUN npm ci --no-audit --prefer-offline

COPY packages/shared-kernel ./packages/shared-kernel
COPY packages/contracts ./packages/contracts
COPY services/identity-service ./services/identity-service
COPY infrastructure/database/prisma ./infrastructure/database/prisma

# Build shared packages and the service
RUN npm --workspace=@dental/shared-kernel run build
RUN npm --workspace=@dental/contracts run build
RUN npm --workspace=@dental/identity-service run db:generate 2>/dev/null || true
RUN npm --workspace=@dental/identity-service run build

# ── Runtime image ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/services/identity-service/dist ./dist
COPY --from=builder /app/services/identity-service/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001
CMD ["node", "dist/main.js"]
