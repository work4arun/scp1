# syntax=docker/dockerfile:1.7
# ── Strategic Control Portal — Next.js Standalone Production Build ──
# Uses Next.js `output: "standalone"` for lightweight self-contained runner.
# BuildKit layer caching keeps npm install and .next/cache across rebuilds.

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund \
 && npm cache clean --force

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN --mount=type=cache,target=/app/.next/cache \
    --mount=type=cache,target=/root/.npm \
    npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache openssl tini \
 && addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copy ALL node_modules from deps (includes prisma CLI, engines, and all deps)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
# Overlay standalone server (optimized, self-contained)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./standalone-work
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Merge standalone's minimal server.js from standalone-work into /app
RUN cp standalone-work/server.js . && rm -rf standalone-work

COPY --chown=nextjs:nodejs docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]