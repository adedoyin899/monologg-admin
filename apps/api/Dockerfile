# @monologg/api — production image (features.md Phase 12).
#
# Build from the MONOREPO ROOT (monologg/), not this directory, since pnpm
# workspaces need packages/types and the workspace manifests alongside
# apps/api to resolve `@monologg/types: workspace:*`:
#   docker build -f apps/api/Dockerfile -t monologg-api .
# (docker-compose.yml at the repo root does this automatically.)
#
# Runs the TypeScript source directly via tsx, same as `pnpm dev` — no phase
# ever introduced a compiled build step for the API (only apps/web has one),
# and adding a bundler here is out of a hardening phase's scope. The
# deliberate consequence: devDependencies (tsx, the prisma CLI) stay in the
# runtime image rather than being pruned after a build step. Documented as a
# known simplification in apps/api/README.md, not silently engineered around.
FROM node:20-alpine AS base
RUN corepack enable
# argon2 (services/auth.ts's password hasher) is a native addon. Most releases
# ship a prebuilt musl (alpine) binary and skip this, but there's no way to
# verify that offline for whatever version the lockfile pins — these are the
# node-gyp fallback build tools, so install still succeeds by compiling from
# source if no prebuild matches this exact Node/alpine combination.
RUN apk add --no-cache python3 make g++
WORKDIR /repo

# ── Install ──────────────────────────────────────────────────────────────
# Copy every workspace member's package.json (not just this app's) before
# installing — pnpm's --frozen-lockfile check validates pnpm-lock.yaml
# against the full workspace shape declared in pnpm-workspace.yaml, and errors
# if a workspace member the lockfile knows about (apps/web) is missing from
# disk. Only manifests are copied at this layer (cheap, cache-friendly);
# --filter still limits which packages' dependencies actually get fetched.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json packages/types/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
# apps/api's own "postinstall": "prisma generate" (package.json) runs as part
# of this install — it needs prisma/schema.prisma to already be on disk, so it
# comes along at this layer too (schema-only, changes about as rarely as
# dependencies do — a reasonable cache-layer tradeoff). NOT --ignore-scripts:
# argon2 (services/auth.ts's password hasher) has its own install script that
# builds/fetches its native addon — skipping install scripts wholesale would
# silently break password hashing at runtime.
COPY apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma
RUN pnpm install --frozen-lockfile --filter @monologg/types --filter @monologg/api

# ── Source ───────────────────────────────────────────────────────────────
COPY packages/types packages/types
COPY apps/api apps/api

# Idempotent re-generation against the full schema/migrations now in place —
# a cheap safety net against any drift from the schema-only copy above.
RUN pnpm --filter @monologg/api exec prisma generate

ENV NODE_ENV=production
WORKDIR /repo/apps/api
EXPOSE 3001

# Runs `prisma migrate deploy` before the server starts (features.md Phase 12:
# "DB migrations run on deploy") — see the "start" script in package.json.
CMD ["pnpm", "run", "start"]
