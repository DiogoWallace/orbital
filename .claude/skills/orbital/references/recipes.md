# Recipes — orbital

Step by step for the changes that recur. Read the relevant one **before** starting, not
after. Each ends with what to run, and the mistake it exists to prevent.

---

## 1. A new scientific module

The canonical procedure is `docs/MODULES.md`; this is the operational checklist.
Nothing in the core changes — if it does, stop and raise it.

**1. The database row.** Add an entry to
`apps/api/database/seeders/ModuleSeeder.php`:

```php
[
    'slug'         => 'anatomia-de-um-foguete',
    'discipline'   => 'engenharia',          // existing discipline slug
    'topic'        => 'propulsao',           // existing topic slug
    'title'        => 'Anatomia de um foguete',
    'subtitle'     => '...',
    'summary'      => '...',
    'kind'         => ModuleKind::/* … */,
    'status'       => ModuleStatus::Draft,
    'difficulty'   => DifficultyLevel::/* … */,
    'componentKey' => 'rocket-anatomy',      // ⭐ the key stitching all three layers
    'minutes'      => 20,
    'tags'         => ['Propulsão'],
    'spec'         => [ /* below */ ],
    'sections'     => [ /* Markdown */ ],
],
```

**2. The `spec`.** The core understands exactly four keys and passes everything else
through untouched (ADR 0006, `moduleSpecSchema.passthrough()`):

- `parameters[]` → becomes the control panel by itself. You never write a slider: you
  declare the variable and the core builds the control, the unit, the number format and
  the accessibility.
- `presets[]` → the row of scenario shortcuts.
- `outputs[]` → the readout grid.
- `charts[]` → the chart strip.

Plus `version`, `modelVersion` (recorded with every saved run) and
`view: { renderer, aspectRatio }`. Anything else — `hotspots`, a schematic — reaches
your component intact.

**3. The folder.**

```
apps/web/src/modules/<component-key>/
├── index.ts        default-exports a ModuleDefinition { key, capabilities, Component }
├── Module.tsx      "use client"
├── components/
├── simulation/     ⚠️ pure TypeScript — not one React import
└── data/
```

`capabilities` is not decoration: the shell uses it to reserve layout **before** the
component loads. Values: `simulation`, `dataset`, `3d`, `timeline`, `hotspots`.

**4. The physics.** `step(dt, params) → state`, fixed timestep, deterministic. Drive it
from `useSimulationLoop`, never from a raw `requestAnimationFrame` inside the
component. Copy the shape of `orbital-sandbox/simulation/orbit.ts` and its test.

**5. One line in `apps/web/src/modules/registry.ts`:**

```ts
"rocket-anatomy": () => import("./rocket-anatomy"),
```

**6. Run:**

```bash
docker compose exec api php artisan migrate:fresh --seed
docker compose exec web npm run test
docker compose exec web npm run typecheck
```

Then open `/modulos/<slug>` and confirm the panel appeared **from the `spec`** — if you
hand-built a control, the spec is wrong, not the core.

**The mistake this prevents:** reaching for a shared component and editing it to fit
one module. Born inside the module; copied on the second; promoted to
`components/lab/` on the third (ARCHITECTURE §6).

---

## 2. A new API endpoint

1. **Pick the route group** in `apps/api/routes/api.php`. There are only five, and the
   choice is the security decision:
   - public read → **`auth.optional`** (so a logged-in curator sees their own draft);
   - authenticated read → `auth:sanctum`;
   - **any write → the nested `verified` group** (ADR 0010);
   - anything that sends email → the `throttle:5,10` bucket;
   - anything a brute-forcer would target → `throttle:6,1`.
2. `Http/Requests/V1/` — a FormRequest. No inline validation.
3. `Domain/<Context>/Actions/` — an Action with one `execute()`. The rule goes here.
4. `Http/Resources/V1/` — a Resource. Eloquent never reaches the response. If the UI
   needs to know what the viewer may do, serialize it from the policy the way
   `CommentResource` does with `viewerCan` — never re-derive permissions in React.
5. Test in `tests/Feature/Api/`. **Use `withToken()`, not `actingAs()`**, if visibility
   is part of what you are asserting.

```bash
docker compose exec api php artisan test
docker compose exec api vendor/bin/pint
```

**The mistake this prevents:** a write route that forgets `verified`, or a public route
that forgets `auth.optional`. Both are the documented failure mode of their own ADR,
and neither fails loudly.

---

## 3. A new BFF route in Next

Everything the browser sends to Laravel goes through `apps/web/src/app/api/`. The
browser never talks to the API directly (ADR 0004).

For an ordinary mutation, use the forwarder:

```ts
import { encaminhar } from "@/lib/api/proxy";

export async function POST(request: Request) {
  return encaminhar("/v1/…", { method: "POST", body: await request.json() });
}
```

**Anything that touches the session stays explicit** — login, logout, register, the
Google ticket exchange. They write and delete the httpOnly cookie through
`lib/auth/session.ts`, and hiding that behind a generic helper is how the only
guarantee of ADR 0004 gets lost.

For reads, call `apiFetch` from a Server Component. Never import `lib/api/client.ts`
from a Client Component — it imports `server-only`, so the build fails. That failure is
the protection working, not an obstacle to route around.

---

## 4. A new transactional email

1. A Notification in `app/Domain/Identity/Notifications/`, implementing `ShouldQueue`,
   `tries = 3`, increasing backoff.
2. A Blade view in `resources/views/emails/` — **table layout, hex colors**. No
   `oklch()`, no flexbox; a test asserts `oklch(` never appears in what is sent.
3. Links point at the **frontend**, built from `config('app.frontend_url')` — never at
   the API. Laravel's signed URLs bind the signature to the API host, which is why
   opaque tokens in their own table are used instead.
4. Public endpoints that trigger mail answer **the same sentence and the same 200**
   whether or not the address has an account. The real status goes to the log.

```bash
docker compose restart queue     # queue:work holds the code in memory
```

Then check Mailpit at http://localhost:8125. **Skipping the restart wastes a full
cycle**: Mailpit keeps showing the previous version and the test lies to you.

---

## 5. A new blog post

There is no editing screen. A post is a row created by seeder or tinker:

```bash
docker compose exec api php artisan tinker
```

`cover_path`, `cover_credit` and `cover_source` travel together — a cover without its
credit is a license violation waiting to happen, and the interface cannot render one
without the other. The body is Markdown in the database, rendered by the same pipeline
as module sections (GFM + KaTeX). No HTML crosses the API, so there is nothing to
sanitize. A future `published_at` works as a schedule with no background process.

A draft is reviewable in the real environment: open the final URL while logged in as a
curator — that is what `auth.optional` buys.

---

## 6. Changing a color, a token or a component class

1. The source of truth is the **Nocturne** design system in Claude Design, not the
   repo. Read `_ds/nocturne-933d28f9-6a82-4839-a15b-e93c09ce7468/styles.css` with
   `DesignSync get_file` before inventing a value.
2. In the repo, tokens are in `src/styles/tokens.css` and component classes in
   `src/styles/nocturne.css`.
3. Tokens go in **`:root`, never inside `@theme`**. A `--color-neutral-400` declared in
   `@theme` overrides Tailwind's own `neutral` scale, and the day someone writes
   `text-neutral-400` expecting the default is a day lost.
4. Keep the accent out of data. Blurple means "this responds"; a chart line or canvas
   trace must never borrow it.
5. Component classes go in `@layer components` so a Tailwind utility in the JSX still
   wins — `className="btn btn-primary px-6"` has to do what it looks like it does.
6. A `var()` on a font variable needs a fallback. `--font-inter` is hung on `<html>` by
   the root layout; `global-error.tsx` renders when the root layout is exactly what did
   not render, and a `var()` without a fallback invalidates the whole declaration.

---

## 7. Adding a James Webb image to the landing

```bash
# download the JPEG into apps/web/.webb-src/<esa-id>.jpg, map the name in the script
docker compose exec web node scripts/processar-webb.mjs
```

Then add the entry to `apps/web/src/lib/webb.ts` with the object's data **copied from
the ESA page, not from memory**. The images are ESA/Webb under CC BY 4.0: the credit
renders next to the image with a live link, and removing it breaks the license, not the
layout.

---

## 8. Deploying

```bash
ssh deploy@148.230.93.249 'cd ~/orbital && ./deploy/deploy.sh'
```

The order is backup → build → up → migrate, and it is deliberate. On 1 vCPU, building
on the VPS pins the processor for minutes; CI already publishes all three images to
GHCR on every green push to `main`, so `pull` mode (`docs/DEPLOY.md` §5) is the
alternative.

Before touching production, exercise the production stack locally:

```bash
docker compose -p prodtest -f docker-compose.prod.yml --env-file .env.production \
  up -d --build postgres redis api nginx web
```

---

## 9. Committing

Format since 02/09/2026 — the whole convention is `docs/CONVENCOES-DE-COMMIT.md`:

```
<tipo>(<escopo>)!: <resumo no imperativo, minúsculo, sem ponto, ate 72 col>

<corpo em 80 colunas: por quê, números antes e depois, o que foi descartado>

Refs: ADR 0014
```

`feat fix docs refactor perf test build ci chore exp revert`. `exp` is this
repository's addition: a measured experiment whose finding is the delivery, negative
results included. Scope is the domain, the module key or the tool (`editorial`,
`rocket-anatomy`, `tess`, `brenda`, `design`, `db`, `deploy`, `skill`).

One line per clone: `make hooks`, which points `core.hooksPath` at the versioned
`.githooks/`. The `commit-msg` hook strips AI attribution and refuses a title out of
pattern.

Write the message to a file and commit with `git commit -F .git/MENSAGEM`; a `-m`
passing through `wsl.exe` mangles the text and drops the accents.

Portuguese, imperative, no AI attribution anywhere — commit, PR description, release
or deploy message. The hook does not reach the PR description; the PR template does.

Before the commit, run only what the change touched (SKILL.md §8), and ask the question
no command answers: **did the core change to accommodate one module?**
