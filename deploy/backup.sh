#!/usr/bin/env bash
#
# Dump do PostgreSQL com retenção.
#
# Instalado no cron pelo deploy/install-cron.sh, e também chamado pelo
# deploy.sh antes de qualquer migration.
#
# Formato `custom` (-Fc) e não SQL puro: permite restaurar tabelas isoladas e
# já vem comprimido.

set -euo pipefail

cd "$(dirname "$0")/.."

RETENTION_DAYS="${RETENTION_DAYS:-14}"
BACKUP_DIR="storage/backups"
STAMP="$(date +%Y-%m-%d_%H%M%S)"

# shellcheck disable=SC1091
set -a; . ./.env.production; set +a

mkdir -p "${BACKUP_DIR}"

# Falha cedo e com a causa explícita. Sem esta checagem, o erro aparece como um
# "Permission denied" solto no meio do deploy, e o backup silenciosamente não
# acontece — exatamente na hora em que ele mais importa.
if [ ! -w "${BACKUP_DIR}" ]; then
    echo "Sem permissão de escrita em ${BACKUP_DIR} (dono: $(stat -c '%U' "${BACKUP_DIR}"))." >&2
    echo "Corrija com: sudo chown -R \$(id -u):\$(id -g) ${BACKUP_DIR}" >&2
    exit 1
fi

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

$COMPOSE exec -T postgres pg_dump \
    -U "${DB_USERNAME}" \
    -d "${DB_DATABASE}" \
    -Fc \
    > "${BACKUP_DIR}/orbital_${STAMP}.dump"

# Um dump de 0 byte é pior que nenhum: dá a sensação de estar protegido.
if [ ! -s "${BACKUP_DIR}/orbital_${STAMP}.dump" ]; then
    echo "Backup saiu vazio — abortando." >&2
    rm -f "${BACKUP_DIR}/orbital_${STAMP}.dump"
    exit 1
fi

find "${BACKUP_DIR}" -name 'orbital_*.dump' -mtime "+${RETENTION_DAYS}" -delete

echo "Backup: ${BACKUP_DIR}/orbital_${STAMP}.dump ($(du -h "${BACKUP_DIR}/orbital_${STAMP}.dump" | cut -f1))"

# NOTA: este backup vive no mesmo disco da aplicação. Ele cobre erro humano e
# migration ruim; NÃO cobre perda da VPS. Cópia off-site (S3, rsync para outra
# máquina) é o próximo passo quando houver dado que importe.
