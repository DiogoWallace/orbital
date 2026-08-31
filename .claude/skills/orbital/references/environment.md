# Environment — orbital

Everything about running this project: where it lives, what listens on what, how to
start it, and what to do when it will not come up.

---

## 1. Where the project lives

`~/projects/orbital` **inside WSL (Ubuntu)**. From a Windows session it is reachable at
`\\wsl.localhost\Ubuntu\home\diogo\projects\orbital`.

Ports were chosen so nothing collides with the other WSL projects (`unypneus`, the
`estudos/` sandboxes):

| Service | Host port | Container |
|---|---|---|
| Frontend (Next dev) | **3100** | `web:3000` |
| API (nginx → php-fpm) | **8100** | `nginx:80` |
| PostgreSQL 16 | **5433** | `postgres:5432` |
| Redis 7 | **6380** | `redis:6379` |
| Mailpit (web UI) | **8125** | `mailpit:8025` |

All overridable in `.env` at the repo root: `WEB_PORT`, `API_PORT`, `DB_PORT`,
`REDIS_PORT`, `MAILPIT_PORT`.

---

## 2. Nothing runs on the host

There is no PHP, no Composer and no project-level Node on this machine. Every command
goes into a container. `php artisan ...` typed straight into the shell fails, and
"install PHP to fix it" is the wrong way out.

**Prerequisite:** Docker Desktop with **WSL Integration enabled for the `Ubuntu`
distro** — Settings → Resources → WSL Integration. Without it `docker` does not exist
inside WSL and nothing starts. This has bitten before; see also the orphan-socket
failure mode below.

```bash
cd ~/projects/orbital
cp .env.example .env            # first time only
docker compose up -d
docker compose exec api php artisan migrate --seed
```

Dev account created by the seed: `admin@orbital.local` / `password`. It exists only
outside production, and it is born with an **unconfirmed email**, so the platform shows
the pending-verification banner — that is by design (ADR 0010), not a broken seed. The
"resend" link lands in Mailpit.

---

## 3. Commands

The `Makefile` is only a shortcut. If `make` is missing (`sudo apt install make`), the
direct commands are equivalent:

| Shortcut | Direct command |
|---|---|
| `make up` | `docker compose up -d` |
| `make down` | `docker compose down` |
| `make restart` | `docker compose restart` |
| `make build` | `docker compose build` |
| `make logs` | `docker compose logs -f --tail=100` |
| `make shell` | `docker compose exec api bash` |
| `make web-shell` | `docker compose exec web sh` |
| `make db` | `docker compose exec postgres psql -U orbital -d orbital` |
| `make migrate` | `docker compose exec api php artisan migrate` |
| `make fresh` | `docker compose exec api php artisan migrate:fresh --seed` |
| `make test` | `docker compose exec api php artisan test` |

Frontend, inside the `web` container:

```bash
docker compose exec web npm run dev        # already the container's command
docker compose exec web npm run test       # Vitest — module physics
docker compose exec web npm run typecheck  # next typegen && tsc --noEmit
docker compose exec web npm run lint
```

Laravel console and formatting:

```bash
docker compose exec api php artisan tinker
docker compose exec api vendor/bin/pint          # CI runs `pint --test`
docker compose exec api php artisan test --filter=CommentTest
```

---

## 4. How the containers are wired

`docker-compose.yml` at the root, project name `orbital`:

- **api** — php-fpm 8.4, built from `docker/php/Dockerfile` with `UID`/`GID` build args
  so the container writes to the bind mount as you. Mounts `./apps/api`.
- **nginx** — `nginx:1.27-alpine`, publishes `8100`, talks FastCGI to `api`.
- **queue** — the same image running `php artisan queue:work --tries=3
  --max-time=3600`. **Every transactional email goes through it** (ADR 0009): if it is
  down, mail queues and never leaves, and nobody is told.
- **postgres** — `postgres:16-alpine`, initialized with ICU locale pt-BR (deterministic
  ordering) and `docker/postgres/init.sql` enabling `pg_trgm`, `unaccent`, `citext`.
- **redis** — cache, queue, and the 60-second store for the Google auth ticket.
- **mailpit** — fake SMTP. Nothing leaves the machine in development, so a wrong
  address in a test cannot become a real email to a stranger.
- **web** — plain `node:24-alpine` running `npm install && npm run dev -- -H 0.0.0.0`.
  The `-H 0.0.0.0` is load-bearing: without it the dev server listens only inside the
  container and the published port answers nothing.

The `web` container's environment carries the two API addresses that are *not*
interchangeable:

- `API_INTERNAL_URL=http://nginx` — server-side calls, over the Compose network.
- `API_PUBLIC_URL=http://localhost:8100` — used **only** to send the user to Google.
  It is the address a *browser* can reach; everything else stays internal.

---

## 5. When something will not come up

**`Permission denied` writing `storage/`, and the Pest suite failing en masse with a
Monolog `UnexpectedValueException`.** The API image was built before the
`USER ${UID}` line in `docker/php/Dockerfile`, so it runs as `www-data`, which does not
own the bind mount. Rebuild — do not `chmod -R 777`:

```bash
docker compose build api queue && docker compose up -d api queue
```

**502 from nginx right after `docker compose restart api`.** nginx resolves the
php-fpm address once, at startup, and the restarted container came back with a new IP:

```bash
docker compose restart nginx
```

**`docker: command not found` inside WSL.** Docker Desktop's WSL integration is off for
the `Ubuntu` distro, or Docker Desktop is in the orphan-socket state where the error
appears only in its own log and only a reboot clears it. Check the integration toggle
first.

**Email does not arrive in Mailpit.** Check the worker: `docker compose ps queue`. Mail
is queued, so a stopped worker fails silently. After editing a notification class or a
mail Blade view, **restart the worker** — `queue:work` holds the code in memory and
will keep sending the previous version.

**`npm run typecheck` fails on unknown route types or image imports.** The script runs
`next typegen` first for exactly this reason; if you ran `tsc --noEmit` by hand,
`next-env.d.ts` and `.next/types` are missing, because they are generated and not
versioned.

---

## 6. Windows ↔ WSL interop

Working on this repo from a Windows session, three things fail *silently*:

1. **`$PWD` inside WSL is not always the real directory.** With Docker Desktop, a
   `cd /home/... && docker run -v "$PWD":/app` mounts an ephemeral staging path below
   `/mnt/wsl/docker-desktop-bind-mounts/` — the command "works" and the files vanish.
   Always use the literal absolute path in `-v`.

2. **`wsl.exe -d Ubuntu -- bash -lc '...'` mangles the command.** Both Git Bash (MSYS
   path conversion) and PowerShell (expansion of `$`, `;`, `&&`, nested quotes) corrupt
   the string. The classic symptom is variables arriving empty; a nastier one is a
   backslash escape being eaten — an inline `sed 's/\r$//'` arrives as `s/r$//` and
   deletes the last character of every line ending in `r`, with no error at all.
   Two reliable ways out: put the logic in a `.sh` file inside the repo and run
   `wsl.exe -d Ubuntu -- bash /path/script.sh`, or pass a single argv-style command
   with no shell metacharacters. Prefix Git Bash invocations with `MSYS_NO_PATHCONV=1`.

3. **Editing WSL files from Windows writes CRLF, and PowerShell 5.1's `Out-File
   -Encoding utf8` writes a BOM.** In `.sh` that is `$'\r': command not found`; in
   `.env` the `\r` ends up inside the variable *value* and breaks HTTP headers and
   `hash_equals` with no useful message; a BOM before a YAML `---` makes frontmatter
   stop being recognized without any error.

   **This repository has no `.gitattributes` and no `.editorconfig`.** There is no
   guard. Adding `* text=auto eol=lf` and `charset = utf-8` here is a small, real
   improvement worth proposing.

Writing files through the UNC path `\\wsl.localhost\Ubuntu\home\diogo\projects\orbital`
works well and is the preferred route; verify line endings afterwards with
`file <path>` and fix them from a script, per point 2.

---

## 7. Production

Full procedure in `docs/DEPLOY.md`. The short version:

VPS `148.230.93.249` (Hostinger, Ubuntu 24.04, **1 vCPU**, 3.9 GB), user `deploy`,
project at `~/orbital`, SSH password login **disabled**. Domain
**orbitalexperiments.com** (Hostinger DNS, A record to that IP).

```
Internet ──443──► Caddy (automatic TLS)
                    ├── /api/*  ──► nginx ──FastCGI──► php-fpm (api)
                    ├── /up     ──► nginx
                    └── /*      ──► Next.js (web)

                  postgres · redis · queue   (no published port)
```

```bash
ssh deploy@148.230.93.249 'cd ~/orbital && ./deploy/deploy.sh'
```

The script's order is deliberate: **database backup → build → up → migrate**. The
backup comes first because a bad migration is exactly when it matters; the build comes
before the container swap so a compilation failure does not take down what is live.

On 1 vCPU, building on the VPS saturates the processor for minutes. CI publishes all
three images to GHCR on every green push to `main`, so the `pull` mode in `DEPLOY.md`
§5 is the escape hatch.

**Known-open production items** (all documented as deliberate omissions):

- **Resend is not finished** — the API key and the three DNS records (SPF, DKIM,
  `_dmarc`) are missing. Until then, transactional email in production is not wired.
- **Google login is off** — `GOOGLE_LOGIN_ENABLED=false`; the OAuth client was never
  created in Google Cloud. The redirect URI must match character for character,
  trailing slash included.
- No off-site backup (the daily dump lives on the application's own disk), no
  zero-downtime deploy, no monitoring or alerting, no CI/CD trigger, no CSP.

The production stack can be exercised locally without Caddy (ports 80/443 are usually
taken):

```bash
docker compose -p prodtest -f docker-compose.prod.yml --env-file .env.production \
  up -d --build postgres redis api nginx web
```

Confirm no container restart-loops, that `/api/v1/modules` answers 200, and that
`/robots.txt` is served by nginx.
