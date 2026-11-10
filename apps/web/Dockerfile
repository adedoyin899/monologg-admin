# @monologg/web — production image (features.md Phase 12).
#
# Build from the MONOREPO ROOT (monologg/), same reason as apps/api/Dockerfile
# (pnpm workspace resolution needs packages/types alongside it):
#   docker build -f apps/web/Dockerfile -t monologg-web .
#
# Two stages: build the static Vite bundle, then serve it from a plain nginx
# image — nothing server-side runs here (VITE_API_MODE=live in production
# points the built bundle at apps/api over HTTP; there's no SSR in any phase).
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo

# See apps/api/Dockerfile's install stage for why every workspace member's
# package.json is copied here, not just this app's.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json packages/types/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @monologg/types --filter @monologg/web

COPY packages/types packages/types
COPY apps/web apps/web

# VITE_* vars are inlined at build time (Vite's import.meta.env), not runtime —
# hence a build ARG, not a docker-compose `environment:` entry. Defaults to
# "mock" (the existing default everywhere else) so a plain `docker build` with
# no --build-arg still produces the same bundle apps/web/README.md describes;
# docker-compose.yml passes VITE_API_MODE=live to actually exercise apps/api.
ARG VITE_API_MODE=mock
ENV VITE_API_MODE=$VITE_API_MODE
RUN pnpm --filter @monologg/web build

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
