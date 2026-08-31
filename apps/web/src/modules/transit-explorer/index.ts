import type { ModuleDefinition } from "@/modules/types";
import Module from "./Module";

/**
 * Explorador de trânsitos (ADR 0005).
 *
 * `dataset` porque a experiência gira em torno de uma série, e não de um
 * sistema físico sendo integrado quadro a quadro. A análise é executada sob
 * comando, não a 60 fps — por isso `simulation` não entra aqui.
 */
const definition: ModuleDefinition = {
  key: "transit-explorer",
  capabilities: ["dataset"],
  Component: Module,
};

export default definition;
