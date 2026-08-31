import type { ModuleDefinition } from "./types";

/**
 * Registro de módulos científicos (ADR 0005).
 *
 * Esta é a única lista manual da plataforma, e é manual de propósito: com
 * `import()` estáticos o bundler consegue separar cada módulo em seu próprio
 * chunk. Uma varredura dinâmica de diretório impediria isso e faria todo
 * visitante baixar todos os módulos.
 *
 * Para adicionar um módulo: crie `src/modules/<key>/`, exporte um
 * `ModuleDefinition` como default e acrescente uma linha aqui. Nada mais no
 * núcleo muda.
 */
type ModuleLoader = () => Promise<{ default: ModuleDefinition }>;

const registry: Record<string, ModuleLoader> = {
  "orbital-sandbox": () => import("./orbital-sandbox"),
  "rocket-anatomy": () => import("./rocket-anatomy"),
  "transit-explorer": () => import("./transit-explorer"),
};

export function isModuleRegistered(key: string | null | undefined): key is string {
  return typeof key === "string" && key in registry;
}

/**
 * Carrega a definição de um módulo.
 *
 * Devolve `null` para chave desconhecida em vez de lançar: um módulo publicado
 * no banco antes de o componente existir é um caso normal do fluxo editorial, e
 * a página deve explicar isso — não quebrar.
 */
export async function loadModule(key: string): Promise<ModuleDefinition | null> {
  const loader = registry[key];

  if (!loader) return null;

  const loaded = await loader();

  return loaded.default;
}

/** Chaves registradas — usada por testes e pela página de diagnóstico. */
export function registeredModuleKeys(): string[] {
  return Object.keys(registry);
}
