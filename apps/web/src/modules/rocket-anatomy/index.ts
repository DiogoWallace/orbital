import type { ModuleDefinition } from "@/modules/types";
import Module from "./Module";

/**
 * Anatomia de um foguete (ADR 0005).
 *
 * `capabilities` declara `hotspots` e nada mais: sem simulação, o shell não
 * reserva espaço para painel de controle nem para a faixa de gráficos.
 */
const definition: ModuleDefinition = {
  key: "rocket-anatomy",
  capabilities: ["hotspots"],
  Component: Module,
};

export default definition;
