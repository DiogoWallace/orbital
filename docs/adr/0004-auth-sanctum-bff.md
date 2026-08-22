# ADR 0004 — Sanctum + BFF no Next.js

**Status:** aceito · **Data:** 2026-08-21

## Contexto

O frontend usa Server Components e roda em origem distinta da API.

## Decisão

O Laravel emite um token Sanctum. O token é guardado em cookie **httpOnly**,
**SameSite=Lax**, escrito e lido apenas pelos route handlers do Next
(`src/app/api/*`). O browser nunca fala diretamente com a API.

```
browser → cookie httpOnly → Next (BFF) → Authorization: Bearer → Laravel
```

## Consequências

- A API permanece stateless: pronta para app mobile, CLI ou notebook.
- Sem dança de CSRF/CORS entre origens; sem token exposto a XSS.
- Server Components leem o cookie e chamam a API autenticados sem gambiarra.
- Custo: uma fina camada de proxy no Next que precisa ser mantida.

## Alternativas consideradas

- **Sanctum SPA (cookie de sessão):** exige domínios stateful configurados, deixa
  a API amarrada a clientes de navegador e complica o repasse de cookies no SSR.
- **Token bearer no cliente:** simples, porém exposto a XSS e sem SSR autenticado.
