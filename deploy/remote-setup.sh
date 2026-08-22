#!/usr/bin/env bash
#
# Provisiona a VPS do zero, a partir da máquina de desenvolvimento.
#
#   ./deploy/remote-setup.sh 148.230.93.249 orbital.seudominio.com.br voce@email.com
#
# Pré-requisito: sua chave pública já autorizada no root da VPS.
#     ssh-copy-id root@SEU_IP
#
# É idempotente — rodar de novo continua de onde parou.

set -euo pipefail

HOST="${1:?uso: remote-setup.sh <ip> <dominio> <email-acme>}"
DOMAIN="${2:?informe o domínio que aponta para ${1}}"
ACME_EMAIL="${3:?informe um e-mail para o Let's Encrypt}"

REPO="${REPO:-https://github.com/DiogoWallace/orbital.git}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31m!! %s\033[0m\n' "$1"; exit 1; }

cd "$(dirname "$0")/.."

# --- Pré-voo ---------------------------------------------------------------
log "Verificando acesso por chave a root@${HOST}"
ssh -o BatchMode=yes -o ConnectTimeout=8 "root@${HOST}" true 2>/dev/null \
    || fail "Sem acesso por chave. Rode antes: ssh-copy-id root@${HOST}"

log "Verificando o DNS de ${DOMAIN}"
RESOLVED="$(getent hosts "${DOMAIN}" | awk '{print $1}' | head -1 || true)"
if [ "${RESOLVED}" != "${HOST}" ]; then
    printf '\033[1;33m'
    echo "AVISO: ${DOMAIN} resolve para '${RESOLVED:-nada}', não para ${HOST}."
    echo "O Let's Encrypt valida por HTTP e vai falhar enquanto isso não bater."
    printf '\033[0m'
    read -rp "Continuar mesmo assim? [s/N] " RESP
    [ "${RESP}" = "s" ] || exit 1
fi

# --- Hardening -------------------------------------------------------------
log "Provisionando o sistema (usuário, firewall, SSH, Docker)"
scp -q deploy/bootstrap.sh "root@${HOST}:/tmp/bootstrap.sh"
ssh "root@${HOST}" "bash /tmp/bootstrap.sh && rm -f /tmp/bootstrap.sh"

log "Confirmando acesso como ${DEPLOY_USER}"
ssh -o BatchMode=yes "${DEPLOY_USER}@${HOST}" true \
    || fail "O usuário ${DEPLOY_USER} não aceitou a chave. NÃO feche sua sessão root atual."

# --- Código ----------------------------------------------------------------
log "Clonando o repositório"
ssh "${DEPLOY_USER}@${HOST}" "test -d ~/orbital/.git || git clone --quiet '${REPO}' ~/orbital"

# --- Configuração ----------------------------------------------------------
log "Gerando .env.production"
ssh "${DEPLOY_USER}@${HOST}" DOMAIN="${DOMAIN}" ACME_EMAIL="${ACME_EMAIL}" 'bash -s' <<'REMOTE'
set -euo pipefail
cd ~/orbital

if [ -f .env.production ]; then
    echo "  .env.production já existe — preservado."
    exit 0
fi

# Segredos gerados na própria VPS: assim eles nunca trafegam nem aparecem em
# histórico de shell da máquina de desenvolvimento.
DB_PASSWORD="$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)"
APP_KEY="base64:$(head -c 32 /dev/urandom | base64)"

sed \
  -e "s|^SITE_DOMAIN=.*|SITE_DOMAIN=${DOMAIN}|" \
  -e "s|^ACME_EMAIL=.*|ACME_EMAIL=${ACME_EMAIL}|" \
  -e "s|^APP_URL=.*|APP_URL=https://${DOMAIN}|" \
  -e "s|^FRONTEND_URL=.*|FRONTEND_URL=https://${DOMAIN}|" \
  -e "s|^APP_KEY=.*|APP_KEY=${APP_KEY}|" \
  -e "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" \
  -e "s|^MAIL_FROM_ADDRESS=.*|MAIL_FROM_ADDRESS=nao-responda@${DOMAIN}|" \
  .env.production.example > .env.production

chmod 600 .env.production
echo "  .env.production criado com segredos gerados localmente."
REMOTE

# --- Deploy ----------------------------------------------------------------
log "Primeiro deploy (build das imagens leva alguns minutos)"
ssh "${DEPLOY_USER}@${HOST}" 'cd ~/orbital && ./deploy/deploy.sh'

log "Agendando scheduler e backup"
ssh "${DEPLOY_USER}@${HOST}" 'cd ~/orbital && ./deploy/install-cron.sh'

# --- Verificação -----------------------------------------------------------
log "Verificando de fora"
sleep 5
for path in / /api/v1/modules /up; do
    CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://${DOMAIN}${path}" || echo 000)"
    printf '  %-20s %s\n' "${path}" "${CODE}"
done

log "Pronto: https://${DOMAIN}"
