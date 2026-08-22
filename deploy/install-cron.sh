#!/usr/bin/env bash
#
# Agenda as tarefas periódicas. Roda uma vez, como o usuário `deploy`.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# O scheduler do Laravel precisa ser chamado a cada minuto; ele decide
# internamente o que roda. Backup às 3h da manhã.
CRON_ENTRIES=$(cat <<CRON
* * * * * cd ${PROJECT_DIR} && docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api php artisan schedule:run >> /dev/null 2>&1
0 3 * * * cd ${PROJECT_DIR} && ./deploy/backup.sh >> ${PROJECT_DIR}/storage/backups/backup.log 2>&1
CRON
)

# Remove entradas anteriores deste projeto antes de reinserir, para o script
# poder ser rodado de novo sem duplicar linhas.
( crontab -l 2>/dev/null | grep -vF "${PROJECT_DIR}" ; echo "${CRON_ENTRIES}" ) | crontab -

echo "Cron instalado:"
crontab -l | grep -F "${PROJECT_DIR}"
