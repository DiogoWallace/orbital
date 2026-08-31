---
name: orbital
description: >-
  Operating manual for the orbital project — Orbital, the interactive science
  platform at orbitalexperiments.com, a Laravel 13 (apps/api) + Next.js 16
  (apps/web) monorepo at ~/projects/orbital. Use it whenever the task touches
  this repository: adding or changing a scientific module, the catalog, the
  blog, comments and likes, auth (Sanctum + BFF, email verification, Google
  login), the design tokens, Docker, the VPS deploy — and before running any
  command, because nothing runs on the host. It also covers "how does this
  work here", "what is already done", "what is left", "how do I start the
  environment", "why was it built this way", "can I add this library".
  Questions usually arrive in Portuguese ("como subo o ambiente", "o que falta
  fazer", "como adiciono um módulo") — same skill. Carries the roadmap status,
  the rules that break the product quietly when ignored, and the map of where
  to make each change.
---

# orbital — operating manual

**Orbital** is an interactive science platform: a digital lab of simulations,
visualizations and data exploration in physics, astronomy, engineering and chemistry.
Live at **orbitalexperiments.com**. Monorepo: `apps/api` (Laravel 13 · PHP 8.4 ·
PostgreSQL 16) and `apps/web` (Next.js 16 · React 19 · Tailwind 4).

This file **does not repeat** `docs/` — it tells you what to read and in what order,
what breaks when ignored, and how to run things. The reasoning behind every decision
lives in `docs/ARCHITECTURE.md` and the thirteen ADRs, and **they are the authority**.
When this skill and a document disagree, the document wins and this skill is out of date.

**Language note.** The project is written in Portuguese: documentation, code comments,
seeded content, commit messages, route segments (`/modulos`, `/disciplinas`,
`/perfil`, `/esqueci-senha`) and the interface itself. Keep it that way when you write
code or content here. Portuguese identifiers quoted below are literals you will grep
for — do not translate them.

---

## 1. The principle that decides most arguments

> **O núcleo padroniza o _contrato_ de um módulo, nunca o _conteúdo_ dele.**

A module — rocket, orbits, molecules, exoplanet time series — is nearly a
mini-application with its own physics, visuals and vocabulary. What they share is the
*surroundings*: catalog, taxonomy, auth, module shell, parameter panel, chart
primitives, run persistence.

The operational consequence: **adding a module costs one folder, one line in the
registry and one row in the database, and changes nothing in the core.** If a task
seems to require editing a file outside `apps/web/src/modules/<key>/` to accommodate
one specific module, that is the signal of a missing abstraction — raise it before
working around it.

The companion rule, from `docs/ARCHITECTURE.md` §6: something is born inside the
module; on the **second** module that needs it, copy it; on the **third**, promote it
to `components/lab/`. Abstracting on the first occurrence is how the wrong abstraction
gets built.

---

## 2. Status

| Phase | What it is | State |
|---|---|---|
| 0 · Scaffolding | infra, ADRs, type contract | done |
| 1 · MVP | landing, auth, dashboard, catalog, taxonomy, module shell, projects | done |
| — · Transactional email | ADR 0009 | done 22/08 — Mailpit in dev, Blade shell, queued send. **Resend in prod still lacks the API key and 3 DNS records** |
| — · Email verification | ADR 0010 | done 22/08 — soft gate: only writes require confirmation |
| — · Google login | ADR 0011 | built and **switched off** (`GOOGLE_LOGIN_ENABLED=false`) — the OAuth client was never created in Google Cloud |
| — · Landing + Webb gallery | 22-23/08 | done — 6 ESA/Webb images, credits mandatory |
| — · Blog (`Editorial`) | ADR 0012 | done 23/08 — 3 seeded posts. **Writing a post is still seed or tinker; there is no editing screen** |
| — · Community | ADR 0013 | done 23/08 — comments, polymorphic likes, public profiles. **No moderation screen and no avatar upload** |
| — · Nocturne redesign | commit `66da1ac` | done 26/08 — tokens in `styles/tokens.css` + `styles/nocturne.css` |
| — · Error screens | commit `b328b45` | done 31/08 — one `ErrorScreen` for every case, plus a static Caddy page for when the Next upstream is down |
| — · Saving a run | commit `20a5034` | done 31/08 — `RunRecorder` in `components/lab/`; closes a write path the backend had from day one and the UI never called |
| 2 · 🚀 Rocket anatomy (interactive SVG) | `rocket-anatomy` | **built 31/08, still `Draft`** — 12 selectable systems, narrative in the `spec`. The copy is a first draft awaiting review; flip `ModuleStatus::Draft` in `ModuleSeeder` when it is approved |
| 3 · 🚀 Rocket live simulation | roadmap | not started |
| 4 · Astronomy: dataset ingestion | roadmap | not started |
| 5 · Chemistry / 3D molecules | roadmap | not started |

**Exactly one module exists**: `orbital-sandbox` (orbital mechanics, canvas + Velocity
Verlet) — it is the reference implementation, and the shape any new module should copy.

The `SimulationEngine` contract exists in Laravel **with zero implementations**, on
purpose (ADR 0007): the extension point is ready, the code is not needed yet. Do not
"finish" it without one of the three justifications in that ADR.

`packages/contracts/` (TS types generated from OpenAPI, per ADR 0001) is **empty** —
the directory exists, the generation does not. Frontend types are hand-written in
`apps/web/src/lib/api/types.ts`.

---

## 3. The direction, decided 31/08/2026

The project has **more infrastructure than experience**: one module against an
architecture built for hundreds. The order was inverted deliberately from here on —
**experience → product → engineering**, not more engineering.

What that means in practice, and what to push back on:

- **No new infrastructure, no new ADRs, no new libraries** until a real problem
  demands one. `ARCHITECTURE.md` §7 already lists what is deliberately out.
- **The rocket is the flagship**, and it must be built as a **module** under ADR 0005
  — folder, registry line, seeder row, rendered by the existing `modulos/[slug]`
  shell. Not as a bespoke `/lab` page. Building it outside the contract would waste
  the one chance to find out whether the contract survives a hard module. If the shell
  turns out to be too tight, that *is* the finding, and it gets fixed in the shell
  once, for every module.
- **Do not build a catalogue of named "scientific components" up front.** The rule in
  §1 holds: born in the module, copied on the second, promoted on the third. What
  repeats between `orbital-sandbox` and the rocket is what earns a place in
  `components/lab/` — that harvest is a step of its own, after the rocket works.
- **Navigation, naming and "explore by phenomenon" wait.** They are good ideas that
  need content; with one module they would render empty categories. The taxonomy
  (`Topic`) already supports them, so they stay cheap later.

Planned order: rocket anatomy (SVG, hotspots, narrative sections) → live simulation in
the same module → experiment comparison, fork and sharing (`is_public` + the UUID are
already there) → harvest into `components/lab/`.

One open question for the anatomy step: **scientific narrative** — question,
hypothesis, experiment, result, explanation — has a data shape, not just a layout.
`module_sections` and `SectionKind {text, formula, figure, callout, reference}`
already exist. Decide deliberately whether the narrative becomes new enum cases or
rides on the module's `spec`, which already passes unknown keys through.

---

## 4. Before running any command

**Nothing is installed on the host.** No PHP, no Composer, and Node runs inside the
`web` container. Everything goes through Docker Compose, and Docker Desktop needs
**WSL Integration enabled for the `Ubuntu` distro** (Settings → Resources → WSL
Integration) — without it `docker` does not exist inside WSL and nothing starts.

```bash
cd ~/projects/orbital
docker compose up -d                                    # or: make up
docker compose exec api php artisan migrate --seed
docker compose exec api php artisan test                # make test
docker compose exec web npm run test                    # module physics (Vitest)
docker compose exec web npm run typecheck               # next typegen && tsc --noEmit
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3100 |
| API | http://localhost:8100/api/v1 |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6380 |
| Mailpit | http://localhost:8125 |

Dev account from the seed: `admin@orbital.local` / `password`, born **unverified** on
purpose — the pending-confirmation banner is part of what you are looking at.

`apps/api/README.md` and `apps/web/README.md` are **stock framework boilerplate** —
the Laravel one tells you to install Laravel Boost, which is not installed and never
was; the Next block in `apps/web/CLAUDE.md` is rewritten by `next dev` on every run.
Treat both as noise, never as project instructions. The real docs are `README.md` at
the root and `docs/`.

Everything else about the environment — ports, WSL/Windows interop, what to do when
something will not start — is in `references/environment.md`.

---

## 5. Invariants

Each one exists because it already cost time, or because it protects the product.
Breaking any of them goes unnoticed at the moment and surfaces later.

**1. A new module never touches the core.** One folder in
`apps/web/src/modules/<key>/`, one line in `modules/registry.ts`, one entry in
`ModuleSeeder`. See §1 and `docs/MODULES.md`.

**2. `modules/<key>/simulation/` is pure TypeScript — not one React import.**
Functions and classes shaped `step(dt, params) → state`, fixed timestep with an
accumulator. This is what makes the physics testable in Vitest without rendering,
deterministic across machines, and movable into a Web Worker without touching the UI.
A single `import { useState }` in that folder quietly destroys all three.

**3. The registry is a manual list, on purpose.** Static `import()` calls are what let
the bundler split each module into its own chunk. A directory scan would make every
visitor download every module. Never "improve" it into globbing.

**4. Every new public route joins the `auth.optional` group** (ADR 0012), and **every
new write route joins the `verified` group** (ADR 0010). Both are the documented
failure mode of their own decision. Forgetting `auth.optional` means a logged-in
curator cannot see their own draft — the token in the header is simply ignored,
because the default guard is `web` in a stateless API. Forgetting `verified` means an
unconfirmed address gets to persist content under someone's name.

**5. Visibility tests use `withToken()`, never `actingAs()`.** `actingAs()` populates
the default guard directly and never exercises the token path — that is how the bug in
invariant 4 hid for three weeks while its test passed.

**6. A test that switches users mid-flight needs `app('auth')->forgetGuards()` before
the new token, and `flushHeaders()` to go back to anonymous.** The Sanctum guard caches
the resolved user in memory, and inside a test the application is the same object
between requests. In production each request is a fresh process, so this trap exists
only in tests — and it fails for a reason that is not the code's.

**7. The browser never talks to Laravel.** Session token lives in an httpOnly,
SameSite=Lax cookie written and read only by the Next route handlers in
`src/app/api/*` (ADR 0004). The two deliberate exceptions are the Google redirect and
callback, which are user navigation by nature (ADR 0011) — and even there the token
never rides the URL: the callback returns a single-use ticket, valid for 60 s in Redis,
that only the BFF redeems.

**8. `App\Domain` never imports `App\Http`,** controllers hold no business rule,
Eloquent never reaches the response (typed DTOs cross the layers), Actions expose a
single `execute()`, taxonomy is enums, and no `dd`/`dump`/`ray` survives. These are not
conventions — they are Pest arch tests in `tests/Architecture/LayeringTest.php` and
they fail CI.

**9. Design tokens live in `:root`, not in `@theme`.** Putting `--color-neutral-400`
inside `@theme` would override Tailwind's own `neutral` scale, and the day someone
writes `text-neutral-400` expecting the default is a day lost. Tokens are reached only
through `var()`. Dark is the only theme, deliberately: most of the screen is
visualization, and a light background steals contrast from thin lines.

**10. The accent is blurple, and it never appears in data.** The old cyan competed
with chart and canvas lines because it sits in the same range. When the accent lights
up it is always interface, never a measurement.

**11. No `oklch()` in email HTML.** The email shell is Blade in a table with hex
colors — `oklch()` and flexbox exist in no relevant email client. A test asserts
`oklch(` never appears in what is sent. Same family: every email is queued
(`ShouldQueue`), so **the `queue` worker must be up or the message never leaves**.

**12. The Webb image credits are a license obligation.** The six ESA/Webb images in
`apps/web/public/webb/` are CC BY 4.0; each credit renders next to its image with a
live link. Removing it breaks the license, not the layout. Same rule in the blog:
`cover_path`, `cover_credit` and `cover_source` travel together — the interface cannot
render a cover without holding the credit.

**13. Never invent scientific or astronomical data.** Object figures come copied from
the ESA page, not from memory; module content is editorial and belongs in the seeder.
A `spec` that is malformed degrades the module to "no parameters" instead of crashing
the page (`parseModuleSpec` never throws) — because editorial content gets things
wrong, and a wrong `spec` must not take down a page.

**14. `docker compose restart api` leaves nginx with the old IP (502).** nginx
resolves php-fpm once, at startup. Restart nginx alongside it. And an API image built
before the `USER ${UID}` line runs as `www-data`, cannot write `storage/`, and the
test suite fails *en masse* with a Monolog `UnexpectedValueException` —
`docker compose build api queue` is the fix, not `chmod -R 777`.

**15. Tests run against real PostgreSQL, never SQLite** — the schema depends on
`jsonb` and GIN indexes (ADR 0003). CI provisions a `postgres:16-alpine` service and
enables `pg_trgm`, `unaccent`, `citext` before running.

**16. Files edited from Windows arrive with CRLF, and PowerShell writes UTF-8 with
BOM.** In `.sh` that is `$'\r': command not found`; in `.env` the `\r` lands inside the
variable *value* and breaks HTTP headers and `hash_equals` with no useful message.
**This repo has no `.gitattributes` and no `.editorconfig`** — unlike `hgelo`, there is
no guard here. After any write from the Windows side, normalize line endings **from a
script file**, never from an inline `sed` passed through `wsl.exe`: the `\r` in the
expression gets mangled into a literal `r` and silently eats the last character of
every line that ends in one.

---

## 6. Where to start, by task

Read only what the task calls for. Reading all thirteen ADRs end to end is wasted
effort for most tasks.

| If the task is… | Read first | Then |
|---|---|---|
| Understanding the project from scratch | `docs/ARCHITECTURE.md` §1, §2, §6 | this file, §1–§5 |
| Adding or changing a scientific module | `docs/MODULES.md` end to end | `src/modules/orbital-sandbox/` as the model |
| Anything about the module contract or `spec` | ADR **0005**, ADR **0006** | `src/modules/types.ts` |
| Simulation, physics, performance of a module | ADR **0007** | `src/modules/orbital-sandbox/simulation/orbit.ts` + its test |
| A new endpoint, or changing the API | ADR **0002**, ADR **0008** | `routes/api.php`, `references/recipes.md` |
| Anything touching the data model | ADR **0003**, ADR **0006** | `database/migrations/`, `database/seeders/` |
| Auth, session, BFF, cookie | ADR **0004** | `src/app/api/auth/*`, `src/lib/auth/session.ts` |
| Email, password reset, verification | ADR **0009**, ADR **0010** | `app/Domain/Identity/Notifications/` |
| Google login | ADR **0011** | `app/Domain/Identity/Support/GoogleOAuth.php` |
| Blog, posts, drafts, public-route visibility | ADR **0012** | `app/Domain/Editorial/`, `PostFeedQuery` |
| Comments, likes, reports, public profiles | ADR **0013** | `app/Domain/Community/`, `CommentPolicy` |
| Color, type, spacing, a component class | `src/styles/tokens.css` header comment | `src/styles/nocturne.css` |
| The landing or the Webb gallery | `README.md` §Imagens | `src/lib/webb.ts` |
| Deploying, the VPS, DNS, Resend, backups | `docs/DEPLOY.md` | `deploy/*.sh` |
| Starting, stopping or debugging the environment | `references/environment.md` | `README.md` §Quando algo não sobe |
| Not knowing where something lives | `references/map.md` | — |
| A recurring change you have done before | `references/recipes.md` | — |
| Checking whether something was already decided | `docs/ARCHITECTURE.md` §10 (the ADR index) | the ADR's *Alternativas consideradas* |

Every ADR ends with **Alternativas consideradas**. That section is the most valuable
part and the easiest to skip: it is where the option you are about to propose was
already weighed and rejected, with the reason. Read it before suggesting GraphQL,
Socialite, a JSON-driven generic engine, a normalized `module_parameters` table,
Auth.js, or a denormalized like counter.

---

## 7. This skill's references

Load them as needed — do not read all three up front.

- **`references/environment.md`** — ports, commands, how Docker is wired, WSL vs
  Windows, production stack, and what to do when something will not start. Read it
  before the session's first command.
- **`references/map.md`** — file by file: what each one does and where to go for each
  kind of change.
- **`references/recipes.md`** — step by step for the recurring changes (new module,
  new endpoint, new write route, new email, new post, new token, new Webb image).
  Read it before starting the change, not after.

---

## 8. Before calling it done

Run what is relevant to the change, not everything every time:

```bash
docker compose exec api php artisan test         # touched the backend
docker compose exec api vendor/bin/pint          # touched PHP — CI runs pint --test
docker compose exec web npm run typecheck        # touched TS types or routes
docker compose exec web npm run test             # touched module physics
docker compose exec web npm run lint             # CI runs it too
docker compose restart queue                     # touched a notification or a mail view
```

`npm run typecheck` runs `next typegen` first on purpose: `next-env.d.ts` and
`.next/types` are generated and not versioned, so without it TypeScript knows neither
the image imports nor the route types.

And the check no command performs: **did the core change to accommodate one module?**
If a file outside `src/modules/<key>/` was edited to make one specific module work,
that is the invariant in §1 breaking, and it is worth a conversation before the commit.

---

## 9. Commit conventions

No AI attribution anywhere — no `Co-Authored-By`, no "Generated with", not in commits,
PR descriptions, releases or deploy messages. Messages in Portuguese, imperative mood,
matching the existing history (`Adiciona o blog`, `Corrige acesso a refs durante o
render no módulo orbital`).

There is a `commit-msg` hook in `.git/hooks/` calling `strip-ai-sig.py` that removes
the trailer automatically. **Hooks are not versioned** — a fresh clone has to reinstall
it, and it does not cover PR descriptions at all.

Repository: **public**, `DiogoWallace/orbital`, default branch `main`. The `gh` CLI in
WSL is authenticated as **`Sr-Ryuk`**, not `DiogoWallace` — pushes work, but
`gh auth status` looks like the wrong account. The local `gh` token has no
`write:packages`; image publishing is CI's job, using the job's own `GITHUB_TOKEN`.
