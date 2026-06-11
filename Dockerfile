# --- Сборка клиента ---
FROM node:22-bookworm-slim AS client-build
WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Сборка сервера ---
FROM node:22-bookworm-slim AS server-build
WORKDIR /build/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build && cp -r src/db/migrations dist/db/migrations && npm prune --omit=dev

# --- Рантайм ---
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=server-build /build/server/node_modules ./node_modules
COPY --from=server-build /build/server/dist ./dist
COPY --from=server-build /build/server/package.json ./
COPY --from=client-build /build/client/dist ./public
COPY data ./data

ENV PORT=3001 \
    DB_FILE=/app/db/word-training.sqlite \
    UPLOADS_DIR=/app/uploads \
    DATA_DIR=/app/data \
    CLIENT_DIST=/app/public

VOLUME ["/app/db", "/app/uploads"]
EXPOSE 3001

CMD ["node", "dist/index.js"]
