import type { ModuleDefinition } from "@/modules/types";
import Module from "./Module";

/**
 * Definição do módulo, tudo o que o registry precisa conhecer.
 *
 * A `key` precisa ser idêntica ao `component_key` da linha correspondente na
 * tabela `modules` — é ela que costura banco e código (ADR 0005).
 */
const definition: ModuleDefinition = {
  key: "orbital-sandbox",
  capabilities: ["simulation"],
  Component: Module,
};

export default definition;
