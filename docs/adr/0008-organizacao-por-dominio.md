# ADR 0008 — Organização por domínio (DDD leve) no Laravel

**Status:** aceito · **Data:** 2026-08-21

## Contexto

O padrão `app/Models` + `app/Http/Controllers` não escala quando a aplicação
cresce em contextos distintos (catálogo, projetos, datasets, simulação).

## Decisão

`app/Domain/<Contexto>/{Models,Data,Actions,Queries,Enums,Events}` para o núcleo
de negócio, `app/Http` só para transporte, `app/Modules/<Nome>` para o código
específico de um módulo científico.

Regras verificadas por testes de arquitetura (Pest arch), não apenas combinadas:

- `Domain` não pode importar `Http`;
- controllers não contêm regra de negócio — recebem um `FormRequest`, chamam uma
  `Action` e devolvem uma `Resource`;
- Eloquent não vaza para a resposta: DTOs tipados atravessam as camadas.

## Consequências

- Casos de uso testáveis sem HTTP.
- Fronteiras explícitas e falhas no CI quando alguém as cruza.
- Custo: mais arquivos por caso de uso do que o Laravel "padrão".

## Alternativas consideradas

- **nwidart/laravel-modules:** isolamento real (cada módulo com `composer.json`),
  porém cerimônia pesada desde o primeiro módulo, cujo backend é fino. Um módulo
  que fique pesado pode ser promovido a pacote depois, sem alterar o núcleo.
