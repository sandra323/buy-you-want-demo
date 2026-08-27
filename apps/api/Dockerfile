# Multi-stage API image for the LightBuy monorepo (Node 20 Alpine).
# Build context: repository root (`docker compose build`).
#
# NODE_IMAGE can be a Hub mirror when auth.docker.io is unreachable, e.g.
# docker.m.daocloud.io/library/node:20-alpine

ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE} AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter api... --filter @lightbuy/shared...

FROM deps AS builder
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @lightbuy/shared build && \
    rm -rf apps/api/dist apps/api/tsconfig.build.tsbuildinfo && \
    pnpm --filter api build && \
    mkdir -p apps/api/node_modules

FROM ${NODE_IMAGE} AS runner
RUN apk add --no-cache netcat-openbsd
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/scripts ./apps/api/scripts
COPY --from=builder /app/packages/shared ./packages/shared
COPY apps/api/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app/apps/api
EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/main.js"]
