---
name: orbital
description: >-
  Operating manual for the orbital project — Orbital, the interactive science
  platform at orbitalexperiments.com, a Laravel 13 (apps/api) + Next.js 16
  (apps/web) monorepo at ~/projects/orbital. Use it whenever the task touches
  this repository: adding or changing a scientific module, the catalog, the
  blog, comments and likes, auth (Sanctum + BFF, email verification, Google
  login), the design tokens, Docker, the VPS deploy, how a commit message is
  written here — and before running any command, because nothing runs on the
  host. It also covers "how does this
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
lives in `docs/ARCHITECTURE.md` and the fourteen ADRs, and **they are the authority**.
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
| 2 · 🚀 Rocket anatomy (interactive SVG) | `rocket-anatomy` | **done 31/08, published** — 12 selectable systems, narrative in the `spec` |
| 3 · 🚀 Rocket live simulation | same module | **done 31/08** — vertical ascent in `simulation/ascent.ts`, 17 Vitest cases. The `spec` carries `hotspots` **and** `parameters`, and the selected system shows the readings that belong to it |
| — · Reproducibility | ADR **0014** | decided 31/08 — the seven links a run must carry, and the honest limit: `sin`/`cos`/`log` are implementation-approximated in ECMAScript, so the synthetic generator is not bit-portable across engines while the analysis path is |
| 4 · Astronomy: transit detection | `transit-explorer` | **built 31/08 on synthetic curves, still `Draft`** — BLS, detrend, fold, S/N in pure TS with 36 test cases; five teaching targets (`SIN-1`..`SIN-5`). Real TESS data is not ingested yet |
| 4b · Dataset ingestion | `Domain/Datasets` | **built 31/08** — `Dataset` + `DatasetSeries`, `IngestLightCurve`, `datasets:import`, three public routes, 14 tests. Provenance fields are mandatory per ADR 0014; no real curve ingested yet |
| — · Commit conventions | commit `22f84d2` | done 02/09 — `docs/CONVENCOES-DE-COMMIT.md`, plus `exp` for measured experiments; hooks now versioned in `.githooks/` and live here via `core.hooksPath` |
| — · Comparing, forking and sharing runs | `is_public` + UUID | **backend only** — no screen exists |
| 5 · Chemistry / 3D molecules | roadmap | not started |

**Three modules exist and are registered**: `orbital-sandbox` (orbital mechanics,
canvas + Velocity Verlet), `rocket-anatomy` (interactive SVG plus the ascent simulation)
and `transit-explorer` (BLS over synthetic curves, still `Draft`). `orbital-sandbox` is
still the smallest complete example and the shape to copy; `rocket-anatomy` is the one
that proved the contract survives a hard module.

The seeder carries a **fourth** row that has no component: `geometria-molecular` points
at `molecule-viewer`, which is deliberately absent from `registry.ts`. It is the
"published in the database before the component exists" case, alive in the seed, and
`ModuleRenderer` answers it with an explicit "module unavailable" panel instead of a
blank screen. Do not "fix" it by adding a registry line.

The `SimulationEngine` contract exists in Laravel **with zero implementations**, on
purpose (ADR 0007): the extension point is ready, the code is not needed yet. Do not
"finish" it without one of the three justifications in that ADR.

`packages/contracts/` (TS types generated from OpenAPI, per ADR 0001) is **empty** —
the directory exists, the generation does not. Frontend types are hand-written in
`apps/web/src/lib/api/types.ts`.

---

## 3. The direction — decided 31/08/2026, and where it stands

The project had **more infrastructure than experience**: one module against an
architecture built for hundreds. The order was inverted deliberately from there on —
**experience → product → engineering**, not more engineering.

**The first two steps shipped.** The rocket was built as a module under ADR 0005 —
folder, registry line, seeder row, rendered by the existing `modulos/[slug]` shell — and
the shell held: nothing outside `src/modules/rocket-anatomy/` had to change to
accommodate it. `transit-explorer` followed by the same route. That is exactly the
finding the step existed to produce, and it is why a bespoke `/lab` page was refused.

**The harvest happened on its own.** All three modules import `ParameterPanel`,
`ReadoutGrid`, `RunRecorder` and `LineChart`; `SimulationControls` is shared by the two
that step through time. The §1 rule played out as written — nothing was abstracted on
the first occurrence, and what repeated across three modules is what sits in
`components/lab/` today. There is no pending harvest to schedule; there is a rule to
keep applying.

**What is left of that plan is comparing, forking and sharing runs.** `is_public` and
the UUID are on `SimulationRun`, the policy and the resource expose them, and
`lib/api/types.ts` already knows the shape — and there is no screen anywhere. It is the
same shape as the write path that `RunRecorder` closed on 31/08: the backend was ready
for weeks and the interface never called it.

Still true, and still worth pushing back on:

- **No new infrastructure, no new ADRs, no new libraries** until a real problem demands
  one. `ARCHITECTURE.md` §7 already lists what is deliberately out.
- **Do not build a catalogue of named "scientific components" up front.** The rule in §1
  is what filled `components/lab/`, and it is what should keep filling it: born in the
  module, copied on the second, promoted on the third.
- **Navigation, naming and "explore by phenomenon"** are cheaper than they were with one
  module, but they are still content-hungry: three published modules and one draft do
  not fill a taxonomy. `Topic` already supports them, so they stay cheap later.

The open question from the anatomy step got a **pragmatic answer, not a decided one**:
scientific narrative — question, hypothesis, experiment, result, explanation — rode on
the `spec` (which passes unknown keys through) plus `module_sections` using the
`SectionKind` cases that already existed: `Text`, `Formula`, `Callout`. No new enum case
was added. If a third module needs the same narrative shape, that is the moment to
decide whether it deserves its own kind instead of the spec.

---

## 4. Before running any command

**Nothing is installed on the host.** No PHP, no Composer, and Node runs inside the
`web` container. Everything goes through Docker Compose, and Docker Desktop needs
**WSL Integration enabled for the `Ubuntu` distro** (Settings → Resources → WSL
Integration) — without it `docker` does not exist inside WSL and nothing starts.

```bash
cd ~/projects/orbital
docker compose up -d                                    # the whole stack
docker compose exec api php artisan migrate --seed
docker compose exec api php artisan test                # backend suite
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

`apps/api/README.md` and `apps/web/README.md` **were** stock framework boilerplate
until 02/09 and are not any more: each now says what its half of the monorepo is, that
nothing runs on the host, and where each kind of change goes. The Laravel one used to
tell you to install Laravel Boost — never installed here, never to be — which is
exactly the shape of instruction that reads as project policy while coming from
somewhere else entirely.

What *is* generated: **`apps/web/AGENTS.md`** carries a block that `next dev` writes and
re-adds on every run (`node_modules/next/dist/server/lib/generate-agent-files.js`),
warning that Next 16 breaks with APIs older models were trained on and pointing at
`node_modules/next/dist/docs/`. **`apps/web/CLAUDE.md` is one line importing it**
(`@AGENTS.md`) — the block does not live there. Both files are versioned. That block is
not noise: it is Next's own guidance and worth reading. It is not project policy
either, and removing it from a diff only makes it return as an uncommitted change —
commit it alongside your work. The project's own instructions are `README.md` at the
root and `docs/`.

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

**16. `ParameterPanel` implements only `type: "number"`.** The `spec` schema declares
`number`, `boolean` and `choice`, and the panel does `if (parameter.type !== "number")
return null` — so a module declaring a choice parameter gets a control that silently
does not render. Either implement the missing types in the core when a module actually
needs them, or keep that input out of `parameters`. Note that data selection (which
dataset) belongs outside `parameters` anyway, by ADR 0014: which data and how it is
analysed are different links in the chain. This trap is now written where someone
adding a module will meet it — `docs/MODULES.md`, the `spec` section — so the two have
to move together.

**17. Files edited from Windows arrive with CRLF, and PowerShell writes UTF-8 with
BOM.** In `.sh` that is `$'\r': command not found`; in `.env` the `\r` lands inside the
variable *value* and breaks HTTP headers and `hash_equals` with no useful message.
Since 02/09 the repo **does** have a guard, and it is deliberately partial:
`.gitattributes` pins `eol=lf` on `*.sh`, `*.py`, `*.conf`, `*.sql`, `.env*`,
`Makefile`, `Dockerfile*`, `.githooks/*` and the `Caddyfile` — the places where the
`\r` actually breaks something — and there is **no `* text=auto`**, so nothing else
gets renormalized. `*.csv` is frozen with `-text` because
`tools/brenda/dados/manifesto.csv` is committed with CRLF from Python and the reader
already tolerates it. `apps/api/` keeps Laravel's own `.gitattributes` (`* text=auto
eol=lf`), which wins there by being closer to the file. `.editorconfig` at the root
covers the rest, and `apps/api/.editorconfig` declares `root = true`, so the two never
meet. A `.tsx` written from Windows can still arrive with CRLF — that was the price of
not renormalizing. After any write from the Windows side, normalize line endings
**from a script file**, never from an inline `sed` passed through `wsl.exe`: the `\r` in the
expression gets mangled into a literal `r` and silently eats the last character of
every line that ends in one.

---

## 6. Where to start, by task

Read only what the task calls for. Reading all fourteen ADRs end to end is wasted
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
| Writing the commit for what you just did | `docs/CONVENCOES-DE-COMMIT.md` | §9 below |
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

Since **02/09/2026** every commit carries a Conventional Commits prefix. The whole
convention — types, scopes, title and body rules, footers — is
`docs/CONVENCOES-DE-COMMIT.md`, and **that document is the authority**. What follows
is what you need in hand before writing one.

```
<tipo>(<escopo>)!: <resumo no imperativo>

<corpo — por quê, com os números quando houver medição, em 80 colunas>

<rodapé — Refs / Closes / BREAKING CHANGE>
```

Types: `feat fix docs refactor perf test build ci chore exp revert`. One of them is
this repository's own and it matters here: **`exp`**, a measured experiment where the
finding *is* the delivery, including when it is negative — `exp(brenda): treina o
primeiro modelo, e ele não bate a linha de base`. Neither `feat` nor `fix` would be
true of that commit, and the negative result has to stay findable: it is how
`odd-even` was condemned in one training run and rehabilitated two commits later.

Scopes are the domain, the module key or the tool: `identity`, `catalog`, `editorial`,
`community`, `datasets`, `projects`, `simulation`, `orbital-sandbox`,
`rocket-anatomy`, `transit-explorer`, `lab`, `design`, `db`, `tess`, `brenda`,
`docker`, `deploy`, `adr`, `skill`. Most specific one that is still true, one only —
if two are needed it is usually two commits.

Title: Portuguese, imperative third person (`adiciona`, `corrige`, `mede`), lowercase
after the colon unless a proper noun, no trailing period, **72 characters including
the prefix**, and **with accents**.

Body: wrapped at **80 columns** — the width the history already uses (665 body
lines measured, p90 at 79). The bar is set by that same history and it is high — the *why*, the numbers
before and after, the negative result stated as such, the attempt that was discarded
and why. `git log -1 d488951` is the model to copy. This is the part of the repository
most worth imitating; a body that only restates the diff is a regression from what is
already there.

**Write the message from a file, never `git commit -m` through `wsl.exe`.** That path
mangles the text and eats the accents — it is where the accent-less commits of late
August came from.

```bash
git commit -F .git/MENSAGEM      # arquivo escrito de dentro do WSL, UTF-8, LF
```

**Hooks are versioned now**, in `.githooks/`, and two `git config` lines per clone
are what make Git see them — `core.hooksPath=.githooks` and
`commit.template=.gitmessage`. `make hooks` does both, but **`make` is not installed
in this WSL** (`sudo apt install make`), so reach for the config lines. They are set
on this machine already, since 02/09. The `commit-msg` hook strips AI attribution and refuses a
title outside the pattern, naming the reason. A `.git/hooks/commit-msg` left from an
older clone stops running the moment `core.hooksPath` changes.

**No AI attribution anywhere** — no `Co-Authored-By`, no "Generated with", not in
commits, PR descriptions, releases or deploy messages. The hook covers the commit
message and nothing else: the PR description is on you, and
`.github/pull_request_template.md` carries the reminder next to the checklist.

**The history before 02/09/2026 has no prefixes and stays that way.** `main` is public
and has clones outside this machine; rewriting forty commits to gain a prefix would
trade a readable history for a readable and broken one.

Repository: **public**, `DiogoWallace/orbital`, default branch `main`. The `gh` CLI in
WSL is authenticated as **`Sr-Ryuk`**, not `DiogoWallace` — pushes work, but
`gh auth status` looks like the wrong account. The local `gh` token has no
`write:packages`; image publishing is CI's job, using the job's own `GITHUB_TOKEN`.
