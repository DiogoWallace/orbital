# Como adicionar um módulo científico

Um módulo novo custa **uma pasta, uma linha no registry e uma linha no banco**.
Nada no núcleo muda — se você precisou alterar um arquivo fora de
`src/modules/<key>/`, provavelmente encontrou uma abstração faltando, e vale
discutir antes de contornar.

## As três camadas

| Camada | Onde | Obrigatória |
|---|---|---|
| Dados | linha na tabela `modules` | sim |
| Experiência | `apps/web/src/modules/<key>/` | sim (exceto `kind: article`) |
| Compute / ingestão | `apps/api/app/Modules/<Key>/` | não |

A chave que costura as três é **`component_key`**.

---

## 1. Dados: a linha no banco

Acrescente uma entrada em `apps/api/database/seeders/ModuleSeeder.php`:

```php
[
    'slug'         => 'transito-de-exoplanetas',
    'discipline'   => 'dados',              // slug da disciplina
    'topic'        => 'series-temporais',   // slug do tópico
    'title'        => 'Trânsito de exoplanetas',
    'subtitle'     => 'Encontrar um planeta em uma curva de luz',
    'summary'      => '...',
    'kind'         => ModuleKind::DatasetExplorer,
    'status'       => ModuleStatus::Draft,
    'difficulty'   => DifficultyLevel::Advanced,
    'componentKey' => 'transit-explorer',   // ⭐ liga ao componente
    'minutes'      => 25,
    'tags'         => ['Exoplanetas', 'Fotometria'],
    'spec'         => [ /* ver abaixo */ ],
    'sections'     => [ /* conteúdo em Markdown */ ],
],
```

### O `spec`

O núcleo entende quatro chaves e ignora todo o resto (ADR 0006):

```jsonc
{
  "version": "1.0.0",
  "modelVersion": "1.0.0",          // gravado com cada execução salva
  "view": { "renderer": "canvas", "aspectRatio": "4/3" },

  "parameters": [                    // → vira o painel de controle, sozinho
    {
      "key": "altitude",
      "label": "Altitude inicial",
      "unit": "km",
      "type": "number",
      "min": 200, "max": 40000, "step": 100, "default": 400,
      "description": "Texto de ajuda exibido sob o slider."
    }
  ],

  "presets": [                       // → vira a fileira de atalhos
    { "key": "leo", "label": "Órbita baixa", "values": { "altitude": 400 } }
  ],

  "outputs": [                       // → vira a grade de mostradores
    { "key": "apoapsis", "label": "Apoapsis", "unit": "km", "precision": 0 }
  ],

  "charts": [
    { "key": "altitude", "label": "Altitude no tempo", "xLabel": "min", "yLabel": "km" }
  ],

  // Qualquer outra chave passa intacta para o seu componente.
  "hotspots": [ { "key": "nozzle", "label": "Tubeira" } ]
}
```

**É isso que faz o painel de controle aparecer de graça.** Você não escreve um
slider: declara a variável e o núcleo monta o controle, a unidade, o formato
numérico e a acessibilidade.

---

## 2. Experiência: a pasta do módulo

```
apps/web/src/modules/transit-explorer/
├── index.ts          # a ModuleDefinition
├── Module.tsx        # entrada React ("use client")
├── components/       # visual específico
├── simulation/       # ⚠️ TypeScript puro — nada de React aqui
└── data/             # constantes, esquemáticos, textos longos
```

`index.ts`:

```ts
import type { ModuleDefinition } from "@/modules/types";
import Module from "./Module";

const definition: ModuleDefinition = {
  key: "transit-explorer",          // idêntico ao component_key
  capabilities: ["dataset"],
  Component: Module,
};

export default definition;
```

### A regra que mais importa

`simulation/` é **TypeScript puro**: funções e classes com
`step(dt, params) → state`, sem um único import de React.

Isso não é purismo — é o que permite:

- testar a física no Vitest sem renderizar nada;
- garantir determinismo (mesma entrada, mesma trajetória, em qualquer máquina);
- mover um passo pesado para Web Worker sem tocar na interface.

Veja `src/modules/orbital-sandbox/simulation/orbit.ts` e seu teste como
referência.

---

## 3. Registro

Uma linha em `apps/web/src/modules/registry.ts`:

```ts
const registry: Record<string, ModuleLoader> = {
  "orbital-sandbox": () => import("./orbital-sandbox"),
  "transit-explorer": () => import("./transit-explorer"),   // ← nova linha
};
```

A lista é manual de propósito: com `import()` estáticos o bundler separa cada
módulo em seu próprio chunk. Uma varredura dinâmica de diretório impediria isso
e faria todo visitante baixar todos os módulos.

---

## 4. (Opcional) Compute no servidor

Só quando houver justificativa concreta (ADR 0007): custo inviável no browser,
dataset restrito, ou execução que precisa ser auditável.

```php
// apps/api/app/Modules/TransitExplorer/TransitEngine.php
final class TransitEngine implements SimulationEngine
{
    public function moduleKey(): string { return 'transit-explorer'; }
    public function modelVersion(): string { return '1.0.0'; }

    public function run(SimulationRequestData $request): SimulationResultData { /* ... */ }
}
```

E o registro em `DomainServiceProvider::boot()`:

```php
$this->app->make(SimulationEngineRegistry::class)
    ->register($this->app->make(TransitEngine::class));
```

---

## Onde uma coisa deve morar

| Pergunta | Resposta |
|---|---|
| Dois módulos precisariam disso? | Núcleo (`components/lab/`, `components/data/`) |
| Só este módulo precisa? | Dentro da pasta do módulo |
| É a segunda vez que copio? | Copie de novo — ainda não é abstração |
| É a terceira vez? | Agora sim: promova para o núcleo |

Abstrair na primeira ocorrência é como se cria a abstração errada.

---

## Checklist

- [ ] Linha no `ModuleSeeder` com `component_key` e `spec`
- [ ] Pasta em `src/modules/<key>/` com `index.ts` e `Module.tsx`
- [ ] Física em `simulation/`, sem React
- [ ] Teste da física em `simulation/*.test.ts`
- [ ] Linha no `registry.ts`
- [ ] `npm run test` e `npm run typecheck` passando
- [ ] Módulo abre em `/modulos/<slug>` e o painel aparece a partir do `spec`
