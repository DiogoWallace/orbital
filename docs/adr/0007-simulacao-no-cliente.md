# ADR 0007 — Simulação executa no cliente por padrão

**Status:** aceito · **Data:** 2026-08-21

## Contexto

O usuário arrasta um slider e espera ver o resultado no mesmo quadro. Um
round-trip HTTP por passo de integração é incompatível com isso.

## Decisão

A simulação roda no browser, em TypeScript puro (`modules/<key>/simulation/`),
sem React, com timestep fixo e acumulador — determinística e independente do
framerate da máquina.

O backend só simula quando houver justificativa explícita:

1. custo computacional inviável no browser;
2. dataset grande ou restrito que não deve ser enviado ao cliente;
3. execução que precisa ser reproduzível e auditável (`simulation_runs`).

O contrato `SimulationEngine` existe no Laravel desde o início, **sem
implementações** — o ponto de extensão está pronto, o código ainda não é preciso.

## Consequências

- Latência zero, custo de servidor zero, escala trivial.
- A física é testável no Vitest sem renderizar nada.
- Portar um passo pesado para Web Worker não exige mudar a UI.

## Alternativas consideradas

- **Tudo no servidor:** inviável para interação em tempo real.
- **WebSockets com loop no servidor:** só faria sentido em simulação colaborativa
  multiusuário, fora do escopo atual.
