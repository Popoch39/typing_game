FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY apps/frontend/package.json ./
RUN bun install

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY apps/frontend/ .
EXPOSE 3000
CMD ["bun", "run", "dev"]
