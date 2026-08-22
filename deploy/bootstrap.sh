#!/usr/bin/env bash
#
# Provisionamento inicial da VPS. Roda UMA vez, como root.
#
#   scp deploy/bootstrap.sh root@SEU_IP:/tmp/
#   ssh root@SEU_IP 'bash /tmp/bootstrap.sh'
#
# O que ele faz, e por quê:
#   - cria um usuário `deploy` sem privilégios de root permanentes, porque
#     aplicação não tem motivo para rodar como root;
#   - copia as chaves SSH já autorizadas do root para esse usuário;
#   - DESLIGA login por senha e login direto de root — as duas portas que
#     varredura automatizada tenta primeiro;
#   - fecha tudo no firewall menos SSH, HTTP e HTTPS;
#   - instala fail2ban e Docker.
#
# É idempotente: rodar de novo não quebra nada.

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
SSH_PORT="${SSH_PORT:-22}"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

if [ "$(id -u)" -ne 0 ]; then
    echo "Rode como root." >&2
    exit 1
fi

# --- Pacotes ---------------------------------------------------------------
log "Atualizando o sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    ca-certificates curl gnupg git ufw fail2ban unattended-upgrades \
    postgresql-client make

# --- Usuário de deploy -----------------------------------------------------
log "Preparando o usuário ${DEPLOY_USER}"
if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
    adduser --disabled-password --gecos "" "${DEPLOY_USER}"
fi

# Sem senha definida, `sudo` sem senha é a única forma de o usuário operar.
# O acesso continua limitado a quem tem a chave privada.
echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-${DEPLOY_USER}"
chmod 0440 "/etc/sudoers.d/90-${DEPLOY_USER}"

install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"

if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    chown "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
else
    echo "AVISO: /root/.ssh/authorized_keys não existe. Instale sua chave antes" >&2
    echo "de aplicar o hardening de SSH, ou você perderá o acesso." >&2
    exit 1
fi

# --- Docker ----------------------------------------------------------------
log "Instalando Docker"
if ! command -v docker >/dev/null 2>&1; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list

    apt-get update -qq
    apt-get install -y -qq \
        docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin
fi

usermod -aG docker "${DEPLOY_USER}"
systemctl enable --now docker

# Sem limite, o log de um container pode encher o disco e derrubar tudo.
cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
systemctl restart docker

# --- Firewall --------------------------------------------------------------
log "Configurando o firewall"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}"/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 443/udp comment 'HTTP/3'
ufw --force enable

# --- SSH -------------------------------------------------------------------
log "Aplicando hardening de SSH"
cat > /etc/ssh/sshd_config.d/99-orbital.conf <<CONF
# Chave apenas. Senha era o vetor de ataque mais barato contra esta máquina.
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
CONF

sshd -t
systemctl reload ssh || systemctl reload sshd

# --- fail2ban --------------------------------------------------------------
log "Configurando fail2ban"
cat > /etc/fail2ban/jail.local <<CONF
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port    = ${SSH_PORT}
CONF
systemctl enable --now fail2ban
systemctl restart fail2ban

# --- Atualizações de segurança automáticas ---------------------------------
log "Ativando atualizações de segurança automáticas"
dpkg-reconfigure -f noninteractive unattended-upgrades

# --- Swap ------------------------------------------------------------------
# Build de imagem Docker é o momento de maior pico de memória; sem swap, uma
# VPS pequena mata o processo no meio do `next build`.
if ! swapon --show | grep -q .; then
    log "Criando 2 GB de swap"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl -w vm.swappiness=10 >/dev/null
    echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
fi

log "Pronto"
cat <<MSG

  Usuário de deploy: ${DEPLOY_USER}
  Login por senha:   DESLIGADO
  Root direto:       apenas por chave

  Teste o acesso em OUTRA janela ANTES de fechar esta:
      ssh ${DEPLOY_USER}@\$(curl -s ifconfig.me)

MSG
