# syntax=docker/dockerfile:1
#
# Imagem de produção do frontend.
#
# Usa a saída `standalone` do Next: a imagem final carrega apenas o servidor e
# as dependências efetivamente alcançadas pelo build — algo em torno de 150 MB
# em vez dos ~1,2 GB de um `node_modules` completo.

FROM node:24-alpine AS deps

WORKDIR /app

# Manifestos primeiro: o cache desta camada sobrevive a qualquer mudança de
# código que não mexa nas dependências.
COPY apps/web/package.json apps/web/package-lock.json ./

RUN npm ci

# --- Build ------------------------------------------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Runtime ----------------------------------------------------------------
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuário sem privilégios: o processo do Next não tem motivo para ser root.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
