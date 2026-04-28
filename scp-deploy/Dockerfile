# syntax=docker/dockerfile:1.7
# ---- Strategic Control Portal (SCP) production image ----
# Multi-stage build: deps -> builder -> runner.
# Result: a small image that runs `npm start` on port 3000.

# ---------- 1) deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
# Copy only what's needed to install
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Install ALL deps (dev included) — needed for `next build` and `prisma db seed`
RUN npm ci

# ---------- 2) builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Make sure /app/public exists even if the repo doesn't ship one
RUN mkdir -p public
# Generate Prisma client + build Next.js
RUN npx prisma generate
RUN npm run build

# ---------- 3) runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
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
