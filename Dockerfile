# syntax=docker/dockerfile:1.7
# ── Strategic Control Portal — Bun + Standalone Production Build ──
# Multi-stage: deps → builder → runner
# Uses Bun for fast installs (~3s cached) + Next.js standalone output for tiny runner

FROM oven/bun:1-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --no-frozen-lockfile --production --ignore-scripts
RUN bun prisma generate

FROM oven/bun:1-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN --mount=type=cache,target=/app/.next/cache \
    --mount=type=cache,target=/root/.bun/install/cache \
    bun --bun next build

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache openssl tini \
 && addgroup -S bunjs && adduser -S nextjs -G bunjs

# Copy standalone server + static files
COPY --from=builder --chown=nextjs:bunjs /app/public ./public
COPY --from=builder --chown=nextjs:bunjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:bunjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:bunjs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:bunjs /app/node_modules/.prisma ./node_modules/.prisma

COPY --chown=nextjs:bunjs docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["bun", "run", "server.js"]