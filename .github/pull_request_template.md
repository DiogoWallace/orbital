<!--
Título do PR no mesmo formato dos commits: <tipo>(<escopo>): <resumo>.
Ver docs/CONVENCOES-DE-COMMIT.md.

Sem atribuição de IA na descrição — o hook cobre o commit, não este campo.
-->

## O que muda

<!-- Uma ou duas frases. O que passa a ser possível, ou o que deixa de quebrar. -->

## Por quê

<!--
A razão que o diff não mostra. Se houve medição, os números vêm aqui:
antes → depois, com unidade. Resultado negativo entra igual ao positivo.
-->

## Como verificar

<!--
Só o que a mudança tocou (SKILL.md §8):

docker compose exec api php artisan test      # backend
docker compose exec api vendor/bin/pint       # PHP — a CI roda pint --test
docker compose exec web npm run typecheck     # tipos ou rotas
docker compose exec web npm run test          # física de módulo
docker compose exec web npm run lint
-->

## Referências

<!-- ADR, issue, documento. Remova a seção se não houver. -->

---

- [ ] O núcleo **não** mudou para acomodar um módulo específico — ou mudou, e o
      PR explica por quê (ADR 0005)
- [ ] Rota pública nova entrou em `auth.optional`; rota de escrita nova entrou em
      `verified` (ADRs 0012 e 0010)
- [ ] Teste de visibilidade usa `withToken()`, não `actingAs()`
