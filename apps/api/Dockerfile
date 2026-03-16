FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY apps/api/package.json ./
# Remove workspace dependencies that can't be resolved from npm
RUN sed -i '/"@repo\/typescript-config"/d' package.json
RUN sed -i '/"@repo\/database"/d' package.json
RUN sed -i '/"@repo\/shared"/d' package.json
RUN bun install
COPY packages/typescript-config ./node_modules/@repo/typescript-config
COPY packages/database ./node_modules/@repo/database
COPY packages/shared ./node_modules/@repo/shared

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/ .
RUN bun build src/index.ts --outdir dist --target bun
# Pre-compile migration script
RUN bun build src/db/migrate.ts --outdir dist --target bun --entry-naming migrate.js

FROM base AS runner
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY apps/api/drizzle ./drizzle
EXPOSE 3001
CMD ["sh", "-c", "bun dist/migrate.js && bun dist/index.js"]
