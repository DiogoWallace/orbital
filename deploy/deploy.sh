#!/usr/bin/env bash
#
# Deploy. Roda na VPS, como o usuário `deploy`, de dentro do repositório.
#
#   ssh deploy@SEU_IP 'cd ~/orbital && ./deploy/deploy.sh'
#
# Sequência pensada para que uma falha de build não derrube o que está no ar:
# constrói primeiro, e só troca os containers quando a imagem nova existe.

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

if [ ! -f .env.production ]; then
    echo "Falta .env.production. Copie de .env.production.example e preencha." >&2
    exit 1
fi

# --- Código ----------------------------------------------------------------
log "Atualizando o código"
git fetch --prune origin
git reset --hard origin/"$(git rev-parse --abbrev-ref HEAD)"

REVISION="$(git rev-parse --short HEAD)"
log "Revisão ${REVISION}"

# --- Backup antes de mexer no banco ----------------------------------------
# Migration com erro é justamente quando o backup importa; tirá-lo depois não
# serviria para nada.
if $COMPOSE ps --status running --services 2>/dev/null | grep -q '^postgres$'; then
    log "Backup do banco antes de migrar"
    ./deploy/backup.sh
fi

# --- Build -----------------------------------------------------------------
log "Construindo as imagens"
$COMPOSE build --pull

# --- Sobe ------------------------------------------------------------------
log "Atualizando os serviços"
$COMPOSE up -d --remove-orphans

log "Aguardando o banco"
until $COMPOSE exec -T postgres pg_isready -q; do sleep 2; done

# --- Migrations ------------------------------------------------------------
log "Rodando migrations"
$COMPOSE exec -T api php artisan migrate --force

# O seed é idempotente (updateOrCreate) e mantém a taxonomia em dia. Ele NÃO
# cria a conta de desenvolvimento fora de local — ver DatabaseSeeder.
log "Sincronizando a taxonomia"
$COMPOSE exec -T api php artisan db:seed --force

# --- Limpeza ---------------------------------------------------------------
log "Removendo imagens órfãs"
docker image prune -f >/dev/null

log "Estado final"
$COMPOSE ps --format 'table {{.Service}}\t{{.Status}}'

printf '\n\033[1;32mDeploy da revisão %s concluído.\033[0m\n\n' "${REVISION}"
