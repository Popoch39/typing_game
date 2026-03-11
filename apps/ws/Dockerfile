FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY apps/ws/package.json ./
# Remove workspace dependencies that can't be resolved from npm
RUN sed -i '/"@repo\/typescript-config"/d' package.json
RUN sed -i '/"@repo\/database"/d' package.json
RUN sed -i '/"@repo\/shared"/d' package.json
RUN bun install
COPY packages/typescript-config ./node_modules/@repo/typescript-config
COPY packages/database ./node_modules/@repo/database
COPY packages/shared ./node_modules/@repo/shared

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY apps/ws/ .
EXPOSE 3002
CMD ["bun", "--watch", "src/index.ts"]
