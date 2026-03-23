# ===================================================
# Stage 1: Builder — instala deps y compila TypeScript
# ===================================================
FROM node:20-bullseye-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===================================================
# Stage 2: Runner — imagen de producción optimizada
# ===================================================
FROM node:20-bullseye-slim AS runner

# Baileys es WebSocket puro — no necesita Chromium ni deps de sistema adicionales.
# Si en el futuro se agrega Puppeteer, descomentar la sección de apt-get en este stage.

ENV NODE_ENV=production

WORKDIR /app

# Solo dependencias de producción (sin devDependencies)
COPY package*.json ./
RUN npm ci --omit=dev

# Código compilado del stage anterior
COPY --from=builder /app/dist ./dist

# Usuario sin privilegios (buena práctica de seguridad en contenedores)
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

# Ejecuta migraciones pendientes y luego levanta el servidor
CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/server.js"]
