FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY apps/frontend/package.json ./
RUN sed -i '/"@repo\/shared"/d' package.json
RUN bun install --frozen-lockfile || bun install
COPY packages/shared ./node_modules/@repo/shared

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY apps/frontend/ .
ARG API_INTERNAL_URL=http://api.railway.internal:3001
ARG NEXT_PUBLIC_WS_URL=wss://ws.example.com
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
RUN bun run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["bun", "run", "start"]
