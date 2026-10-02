# Keep every backend stage on the target platform: npm/Prisma/Sharp contain
# architecture-specific binaries which must match the runtime's glibc/OpenSSL.
FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV CHECKPOINT_DISABLE=1 SCARF_ANALYTICS=false
FROM base AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --workspace @cool/backend --include-workspace-root
COPY apps/backend apps/backend
RUN npm run db:generate && npm run build -w @cool/backend && npm prune --omit=dev --workspace @cool/backend --include-workspace-root
FROM base AS runtime
ENV NODE_ENV=production MEDIA_ROOT=/app/data
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /app/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts
RUN install -d -m 0750 -o node -g node /app/data
USER node
# Exercise native dependencies after pruning, on each target platform. No DB needed.
RUN node -e "require('sharp')({ create: { width: 1, height: 1, channels: 3, background: '#fff' } }).webp().toBuffer().then(() => console.log('Sharp OK:', process.arch)).catch(error => { console.error(error); process.exit(1); })" \
    && npm exec --workspace @cool/backend -- prisma --version
EXPOSE 3000
CMD ["node", "apps/backend/dist/main.js"]
