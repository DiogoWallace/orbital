# Deploy

Produção roda em uma VPS com Docker Compose. Três imagens próprias (`api`,
`nginx`, `web`) mais Postgres, Redis e Caddy na borda.

```
Internet ──443──► Caddy (TLS automático)
                    ├── /api/*  ──► nginx ──FastCGI──► php-fpm (api)
                    ├── /up     ──► nginx
                    └── /*      ──► Next.js (web)

                  postgres · redis · queue   (sem porta publicada)
```

Só a 80/443 é exposta. Postgres e Redis existem apenas dentro da rede do
Compose — não há porta publicada para eles, nem com senha.

---

## 1. Provisionar a VPS (uma vez)

Instale sua chave pública primeiro, **antes** do hardening — o script desliga
login por senha e sem a chave você perde o acesso:

```bash
ssh-copy-id root@SEU_IP
```

Depois:

```bash
scp deploy/bootstrap.sh root@SEU_IP:/tmp/
ssh root@SEU_IP 'bash /tmp/bootstrap.sh'
```

O que ele faz:

| Ação | Motivo |
|---|---|
| Cria o usuário `deploy` | aplicação não tem motivo para rodar como root |
| Copia as chaves autorizadas do root | acesso contínuo após o hardening |
| `PasswordAuthentication no` | senha é o vetor mais barato de ataque |
| `PermitRootLogin prohibit-password` | root só por chave |
| UFW: nega tudo menos 22, 80, 443 | superfície mínima |
| fail2ban no sshd | corta força bruta |
| Docker + Compose | runtime da aplicação |
| Limite de log dos containers | log sem teto enche o disco e derruba tudo |
| 2 GB de swap | `next build` estoura a RAM de VPS pequena sem swap |
| `unattended-upgrades` | correções de segurança sem intervenção |

**Teste o acesso numa segunda janela antes de fechar a primeira.**

---

## 2. Preparar a aplicação (uma vez)

```bash
ssh deploy@SEU_IP
git clone https://github.com/SEU_USUARIO/orbital.git ~/orbital
cd ~/orbital

cp .env.production.example .env.production
```

Preencha `.env.production`:

```bash
# senhas fortes
openssl rand -base64 32          # DB_PASSWORD

# chave da aplicação
docker compose -f docker-compose.prod.yml --env-file .env.production \
  run --rm api php artisan key:generate --show
```

Obrigatórios: `SITE_DOMAIN`, `ACME_EMAIL`, `APP_KEY`, `DB_PASSWORD`, `APP_URL`,
`FRONTEND_URL`.

**O DNS precisa estar apontando para o IP antes de subir o Caddy** — a emissão
do certificado é validada por HTTP, e falha em domínio que não resolve.

```bash
./deploy/deploy.sh
./deploy/install-cron.sh
```

---

## 3. E-mail (uma vez)

A plataforma manda e-mail transacional — recuperação de senha, e o que vier
depois. Em desenvolvimento tudo cai no Mailpit e nada sai da máquina; em
produção o transporte é o Resend (ADR 0009).

```bash
# no .env.production
MAIL_MAILER=resend
RESEND_API_KEY=re_...
MAIL_FROM_ADDRESS=nao-responda@orbitalexperiments.com
```

**Os registros DNS vêm antes da chave.** Sem eles a mensagem sai e cai em spam,
e e-mail de recuperação em spam é o mesmo que e-mail não enviado. No painel da
Hostinger, na zona do domínio:

| Tipo | Nome | Conteúdo |
|---|---|---|
| TXT | `@` | `v=spf1 include:amazonses.com ~all` (o valor exato aparece no painel do Resend) |
| TXT | `resend._domainkey` | a chave DKIM que o Resend gera |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:voce@orbitalexperiments.com` |

`p=none` no começo é deliberado: DMARC em modo de observação relata sem
descartar. Endurecer para `quarantine` depois de algumas semanas de relatório
limpo evita bloquear e-mail legítimo por um SPF mal ajustado.

Para conferir de ponta a ponta depois de subir:

```bash
docker compose -f docker-compose.prod.yml exec api php artisan tinker
# >>> Mail::raw('teste', fn ($m) => $m->to('seu@email.com')->subject('Orbital'));
```

O envio é enfileirado (ADR 0009), então **o worker precisa estar de pé** — se o
serviço `queue` estiver parado, o e-mail entra na fila e nunca sai. Vale checar
`docker compose -f docker-compose.prod.yml ps` quando um usuário disser que o
link não chegou.

---

## 4. Login com o Google (opcional)

Enquanto `GOOGLE_LOGIN_ENABLED=false`, o botão não aparece e o resto da
plataforma funciona igual. Para ligar:

1. Em [console.cloud.google.com](https://console.cloud.google.com) → **APIs e
   serviços** → **Credenciais** → criar **ID do cliente OAuth 2.0**, tipo
   *Aplicativo da Web*.
2. Em **URIs de redirecionamento autorizados**, colocar exatamente:

   ```
   https://orbitalexperiments.com/api/v1/auth/google/callback
   ```

   O valor precisa bater caractere a caractere com `GOOGLE_REDIRECT_URI` — o
   Google recusa a troca do código se divergir, inclusive por uma barra no fim.
3. Preencher no `.env.production`:

   ```bash
   GOOGLE_LOGIN_ENABLED=true
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=https://orbitalexperiments.com/api/v1/auth/google/callback
   ```

Para testar em desenvolvimento, o mesmo cliente serve: acrescente
`http://localhost:8100/api/v1/auth/google/callback` à lista de URIs autorizadas
e ligue `GOOGLE_LOGIN_ENABLED=true` no `.env` da raiz.

O `client_secret` fica só na API (ADR 0011). O navegador nunca o vê, e o token
de sessão não passa pela URL: o callback volta com um ticket de uso único,
válido por um minuto, que só o BFF resgata.

---

## 5. Deploys seguintes

```bash
ssh deploy@SEU_IP 'cd ~/orbital && ./deploy/deploy.sh'
```

A ordem do script é deliberada: **backup do banco → build → sobe → migrate**.
O backup vem antes porque migration com erro é exatamente quando ele importa;
o build vem antes da troca dos containers para que uma falha de compilação não
derrube o que já está no ar.

### Construir na VPS ou puxar do registry

Os dois modos usam o mesmo `docker-compose.prod.yml`: cada serviço declara
`image:` **e** `build:`, então a mesma tag serve para construir e para puxar.

| Modo | Comando | Quando usar |
|---|---|---|
| Construir na VPS | `./deploy/deploy.sh` | servidor ocioso; nenhum registry envolvido |
| Puxar do GHCR | `docker compose -f docker-compose.prod.yml --env-file .env.production pull && ... up -d` | servidor com pouca CPU, ou dividido com outra aplicação |

O CI (`.github/workflows/ci.yml`) publica as três imagens no GHCR a cada push
na `main` que passe nos testes. Ele usa o `GITHUB_TOKEN` do próprio job — não
existe token pessoal envolvido, nem escopo extra na conta.

Num servidor de 1 vCPU, construir localmente satura o processador por vários
minutos. Se a VPS passar a hospedar outra coisa, migre para o modo `pull`.

---

## Operação

```bash
# estado
docker compose -f docker-compose.prod.yml ps

# logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f caddy

# console do Laravel
docker compose -f docker-compose.prod.yml exec api php artisan tinker

# backup manual
./deploy/backup.sh

# restaurar
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U orbital -d orbital --clean --if-exists < storage/backups/ARQUIVO.dump
```

---

## O que ainda não existe

Deliberadamente fora desta primeira subida, para não inflar o escopo:

- **Backup off-site.** O dump diário vive no mesmo disco da aplicação. Cobre
  erro humano e migration ruim; **não** cobre perda da VPS.
- **Deploy sem downtime.** Há uma janela de alguns segundos durante o
  `up -d`. Resolver isso exige réplicas e drenagem de conexão.
- **Monitoramento e alerta.** Os healthchecks reiniciam container morto, mas
  ninguém é avisado.
- **Entrega contínua.** A integração já existe: o CI roda os testes e publica as
  três imagens no GHCR a cada push verde na `main` (§5). O que não existe é o
  passo seguinte — o deploy continua sendo um `ssh` disparado à mão.
- **CSP.** Os demais cabeçalhos de segurança estão ativos; o CSP ficou de fora
  porque exige calibrar os estilos inline do Next, e um CSP mal ajustado quebra
  em produção sem quebrar em desenvolvimento.

---

## Verificação local antes de subir

A stack de produção pode ser exercitada na máquina de desenvolvimento sem
Caddy (as portas 80/443 costumam estar ocupadas):

```bash
docker compose -p prodtest -f docker-compose.prod.yml --env-file .env.production \
  up -d --build postgres redis api nginx web
```

Confirme que nenhum container entra em loop de restart, que `/api/v1/modules`
responde 200 e que `/robots.txt` é servido pelo nginx.
