# Map — orbital

Where things live, and where to go for each kind of change. The codebase is small
enough to read, but it is organized by domain, so the answer to "where does this go?"
is almost never "wherever".

```
apps/api/       Laravel 13 · PHP 8.4 · PostgreSQL 16 · Sanctum
apps/web/       Next.js 16 · React 19 · Tailwind 4
packages/       contracts/ — declared in ADR 0001, still EMPTY
docker/         php · nginx · postgres · caddy
deploy/         bootstrap · deploy · backup · install-cron · remote-setup
docs/           ARCHITECTURE.md · MODULES.md · DEPLOY.md · adr/0001..0013
```

---

## Backend — `apps/api`

### `app/Domain/` — business core, almost framework-free

Bounded contexts, each holding some of `Models/ Data/ Actions/ Queries/ Enums/
Policies/ Notifications/ Support/`. **`Domain` never imports `Http`** — an arch test
enforces it.

| Context | What is in it |
|---|---|
| **Catalog** | `Discipline`, `Topic`, `Module`, `ModuleSection`, `Tag`; `ModuleKind`, `ModuleStatus`, `DifficultyLevel`, `SectionKind`; `ModuleCatalogQuery`, `ModulePolicy` |
| **Editorial** | `Post`, `PostStatus`, `PostFeedQuery`, `PostPolicy` — the blog (ADR 0012) |
| **Community** | `Comment`, `Like` (polymorphic), `CommentReport`; `CommentStatus`, `ReportReason`; actions `PostComment`, `EditComment`, `ModerateComment`, `ReportComment`, `ToggleLike`; `CommentPolicy` (ADR 0013) |
| **Identity** | `User`, `SocialAccount`, `Role`; actions `RegisterUser`, `IssueApiToken`, `ResetPassword`, `VerifyEmail`, `SendPasswordResetLink`, `SendEmailVerificationLink`, `FindOrCreateSocialUser`; support `GoogleOAuth`, `AuthExchangeTickets`, `EmailVerificationTokens`, `UsernameGenerator`; the two notifications |
| **Simulation** | `SimulationRun`, `SimulationEngineRegistry`, contract `SimulationEngine` (**no implementations, on purpose**), `RecordSimulationRun`, `SimulationRunPolicy` |
| **Projects** | `Project`, `ProjectStatus`, `ProjectKind` |
| **Datasets** | declared in the architecture, **not yet created** |

**Where a rule goes:** into an `Action` with a single `execute()`. Not into a
controller, not into a model. `PostComment` is the reference — the one-level reply
depth lives there rather than in the schema, because depth is a product decision.

### `app/Http/` — transport only

- `Controllers/Api/V1/` — thin. `Auth/` holds eleven single-action controllers
  (`LoginController`, `RegisterController`, `GoogleRedirectController`,
  `GoogleCallbackController`, `ExchangeTicketController`, and so on).
- `Requests/V1/` — FormRequests; validation lives here, never inline.
- `Resources/V1/` — serialization. `CommentResource` carries
  `viewerCan: {edit, delete, report, moderate}` from `CommentPolicy`, so the frontend
  never re-implements the rule.
- `Middleware/ResolveOptionalUser.php` — the `auth.optional` alias. Calls
  `shouldUse('sanctum')`, which is what makes `Gate` and every policy see the token
  user. Swapping only the request's `setUserResolver` would not work.
- `Middleware/EnsureEmailIsVerified.php` — the `verified` alias, answering RFC 7807
  with `type: /problems/email-not-verified` so the UI can tell "not allowed" from
  "confirm your email".

### `app/Support/Http/`

`ProblemDetails` (the RFC 7807 envelope) and `EmailNotVerifiedException`.

### `routes/api.php`

The whole public contract in one readable file, and the clearest place to see the
authorization model. Five zones, in order:

1. **Auth**, `throttle:6,1` — login, reset, verify.
2. **Email-sending**, `throttle:5,10` — register, forgot-password. Its own narrower
   bucket, because each request sends mail to a box that is not the requester's.
3. **Google**, `throttle:20,1` — redirect, callback, exchange.
4. **`auth.optional`** — the public catalog, blog, profiles, shared runs.
5. **`auth:sanctum`** → nested **`verified`** — every write.

Adding a route means choosing one of these groups. There is no sixth option.

### `database/`

- `migrations/` — 18 files. Catalog on 21/08, auth and Sanctum on 22/08, community on
  23/08.
- `seeders/` — `DisciplineSeeder`, `ModuleSeeder` (**where a new module's row goes**),
  `ProjectSeeder`, `PostSeeder` (3 real posts), `RoleSeeder`, `DatabaseSeeder`.
- `factories/` — one per model, used by the Pest suite.

### `tests/`

- `Feature/Api/` — 11 files, one per surface (`ModuleCatalogTest`, `BlogTest`,
  `CommentTest`, `LikeTest`, `AuthenticationTest`, `EmailVerificationTest`,
  `PasswordResetTest`, `GoogleLoginTest`, `ProfileTest`, `SimulationRunTest`,
  `ProblemDetailsTest`).
- `Architecture/LayeringTest.php` — the ADR 0008 boundaries as executable rules.
  Read it before adding a layer or a namespace; it states what is forbidden faster
  than the ADR does.

---

## Frontend — `apps/web/src`

### `app/` — routes

| Group | Routes |
|---|---|
| `(marketing)/` | `page.tsx` — the landing, with the Webb hero and gallery |
| `(auth)/` | `login`, `esqueci-senha`, `redefinir-senha`, `verificar-email` — each a server page plus a `"use client"` form |
| `(platform)/` | `dashboard`, `explorar`, `disciplinas/[slug]`, `modulos/[slug]`, `projetos`, `projetos/[slug]`, `blog`, `blog/[slug]`, `perfil/[username]`, `conta` |
| `api/` | **the BFF** — `auth/{login,logout,register,forgot-password,reset-password,email/verify,email/resend,google/start,google/callback}`, `posts/[slug]/{comments,like}`, `comments/[id]/{route,like,report,moderation}`, `me/profile` |

Error boundaries (**uncommitted**): `app/error.tsx`, `app/global-error.tsx`,
`app/not-found.tsx`, and the `(platform)` pair. The root `not-found.tsx` is where Next
serves URLs matching no route — it must stay outside the route groups.

### `lib/`

- **`api/client.ts`** — the BFF HTTP client. Imports `server-only`, so a Client
  Component that imports it **breaks the build** instead of leaking the token into the
  bundle. Holds `SESSION_COOKIE = "orbital_session"` and `ApiError` with `fieldErrors`.
- **`api/proxy.ts`** — `encaminhar()`, the shared mutation forwarder. Born at the
  seventh identical BFF route. **Anything that touches the session stays explicit** —
  login, logout and the Google ticket exchange do not go through it, because hiding the
  httpOnly cookie behind a generic helper is how the ADR 0004 guarantee gets lost.
- `api/catalog.ts`, `api/blog.ts`, `api/community.ts` — typed read functions.
- `api/types.ts` — the hand-written API types (`packages/contracts` is still empty).
- **`auth/session.ts`** — `startSession` / `endSession` / `hasSession`. `SameSite=Lax`,
  not `Strict`, so someone arriving from an external link is not logged out.
- `markdown.ts` — `slugificar()` and the heading extractor, shared by the post table of
  contents and the renderer so both produce the same anchor. `rehype-slug` was
  deliberately not added.
- `webb.ts` — the six ESA/Webb images with their credits. Also `datas.ts`, `utils.ts`
  (`cn`).

### `components/`

- `ui/` — `Button`, `Panel`, `Badge`, `Field`, `GoogleButton`. Thin wrappers over the
  Nocturne CSS classes: they bring typing, `aria-*` and composition, **not appearance**.
- `layout/` — `SiteHeader`, `HeaderNav`, `SiteFooter`, `AuthCard`,
  `UnverifiedEmailBanner`, and (uncommitted) `BrandBar`, `ErrorScreen`.
- `lab/` — **the reusable scientific primitives**: `ParameterPanel`,
  `ParameterSlider`, `ReadoutGrid`, `SimulationControls`. This is where something gets
  promoted on its third module.
- `data/` — `LineChart` (its own SVG, around 100 lines; visx and uPlot are the
  documented next steps, not present).
- `catalog/ModuleCard`, `blog/{PostCard,FeedRow}`, `community/{CommentThread,
  CommentItem,CommentForm,LikeButton,Avatar}`, `module/{ModuleRenderer,ModuleSections}`.

`Avatar` renders initials and a color derived from the username — never Gravatar, never
an email hash (ADR 0013).

### `modules/` — the plugin surface

```
modules/
├── types.ts       the contract: Zod schemas for spec/parameters/presets/outputs/charts
├── registry.ts    the single manual list — one static import() per module
└── orbital-sandbox/
    ├── index.ts                    the ModuleDefinition
    ├── Module.tsx                  "use client" entry point
    ├── components/OrbitCanvas.tsx
    └── simulation/orbit.ts + orbit.test.ts     ⚠️ pure TS, zero React
```

`types.ts` is the boundary between core and modules. `moduleSpecSchema` uses
`.passthrough()`: unknown keys (a rocket's `hotspots`) reach the component untouched.
`parseModuleSpec` **never throws** — a malformed spec degrades to "no parameters".

`ModuleRenderer` resolves `component_key` to a registry entry on the server; an unknown
key renders an explicit "module unavailable" panel, never a blank screen. A database
row whose component does not exist yet is a normal editorial state.

### `hooks/useSimulationLoop.ts`

Fixed-step loop with an accumulator (ADR 0007), plus `maxSubsteps` to avoid the fixed
timestep death spiral when a backgrounded tab returns with a huge backlog.

### `styles/`

- **`tokens.css`** — the Nocturne palette. Read its header comment before touching a
  color: it explains why tokens sit in `:root` and not `@theme`, why dark is the only
  theme, and why the accent is blurple rather than cyan.
- **`nocturne.css`** — the component classes, plain CSS over plain HTML, inside
  `@layer components` so a Tailwind utility written in JSX always wins.
- `app/globals.css` — imports Tailwind, KaTeX, then both of the above.

The design source of truth is the **Nocturne** design system in Claude Design, project
`933d28f9-6a82-4839-a15b-e93c09ce7468`, file
`_ds/nocturne-933d28f9-6a82-4839-a15b-e93c09ce7468/styles.css`. The screen designs live
in project `006b6c34-4faf-4e09-92e0-22df896cb0f2` (`Orbital - Redesign.dc.html`).

---

## Infrastructure

| Path | What it is |
|---|---|
| `docker-compose.yml` | development: api · nginx · queue · postgres · redis · mailpit · web |
| `docker-compose.prod.yml` | production: same, plus Caddy, minus mailpit; every service declares both `image:` and `build:`, so one tag serves both building and pulling |
| `docker/php/Dockerfile` | dev image, `UID`/`GID` build args — the reason `storage/` is writable |
| `docker/php/Dockerfile.prod`, `entrypoint.prod.sh`, `php.prod.ini` | production PHP |
| `docker/nginx/default.conf` / `prod.conf` / `Dockerfile.prod` | FastCGI to php-fpm |
| `docker/postgres/init.sql` | `pg_trgm`, `unaccent`, `citext` |
| `docker/caddy/Caddyfile` | edge TLS, routing, and (uncommitted) `handle_errors` |
| `deploy/*.sh` | `bootstrap` (one-time VPS hardening), `deploy`, `backup`, `install-cron`, `remote-setup` |
| `.github/workflows/ci.yml` | three jobs — API (Pest + Pint against real Postgres), web (typecheck, Vitest, lint), images (GHCR, main only, green only) |
