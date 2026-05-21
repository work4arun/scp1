# syntax=docker/dockerfile:1.7
# ---- Strategic Control Portal (SCP) production image ----
# Multi-stage build: deps -> builder -> runner.
# Result: a small image that runs `npm start` on port 3000.
#
# Optimisations applied to keep the build off disk-constrained hosts (ENOSPC):
#   • BuildKit cache mount for /root/.npm so installs reuse the host npm cache
#   • `npm ci --prefer-offline --no-audit --no-fund` to avoid network/metadata churn
#   • `npm cache clean --force` after install — drops ~hundreds of MB of tarballs
#
# Note: we keep devDependencies (prisma CLI, tsx) in the final image because the
# entrypoint runs `prisma migrate deploy` and optionally `npm run db:seed` at
# container start. Pruning them would break startup.

# ---------- 1) deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
# Copy only what's needed to install
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Install ALL deps (dev included) — needed for `next build` and `prisma db seed`.
# `--mount=type=cache` reuses the npm cache layer across builds, drastically
# reducing repeated downloads. `npm cache clean --force` at the end frees the
# extracted tarballs from the layer itself (the cache mount is not part of the
# final image).
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund \
 && npm cache clean --force

# ---------- 2) builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
# Skip Next.js telemetry — saves a network call on every build.
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Make sure /app/public exists even if the repo doesn't ship one
RUN mkdir -p public
# Build Next.js. `npm run build` already runs `prisma generate` first (see the
# build script in package.json), so we do NOT call `prisma generate` separately
# — that was duplicate work on every build.
#
# The BuildKit cache mount for `.next/cache` lets Next.js reuse its compiler
# cache (webpack module cache, etc.) across builds. The first build is full
# speed; subsequent rebuilds after a code change are dramatically faster
# because unchanged modules are pulled from cache instead of recompiled.
# The mount is ephemeral — it is NOT baked into the image, so it adds no size.
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build
# Drop npm's tarball cache — we won't be installing more packages in the runner.
RUN npm cache clean --force

# ---------- 3) runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache openssl tini \
 && addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copy build output + everything needed to run + run migrations + seed
COPY --from=builder --chown=nextjs:nodejs /app/.next         ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public        ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules  ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json  ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma        ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/next.config.* ./

# Entrypoint: run migrations (and optionally seed) before starting the server
COPY --chown=nextjs:nodejs docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["npm", "start"]
