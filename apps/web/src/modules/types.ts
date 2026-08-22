import type { ComponentType } from "react";
import { z } from "zod";
import type { ScienceModule } from "@/lib/api/types";

/**
 * Contrato de um módulo científico (ADR 0005).
 *
 * Este arquivo é a fronteira entre o núcleo e os módulos. Ele define o pouco
 * que o núcleo precisa entender — variáveis, presets, saídas — e deixa o resto
 * do `spec` passar intacto para o componente.
 *
 * O limite é deliberado: o núcleo sabe desenhar um slider a partir de uma
 * definição de variável, e não sabe absolutamente nada sobre órbitas, moléculas
 * ou combustão. É isso que permite o centésimo módulo não tocar em nada aqui.
 */

/** Uma variável ajustável pelo usuário. */
export const parameterSpecSchema = z.object({
  key: z.string(),
  label: z.string(),
  unit: z.string().optional().default(""),
  type: z.enum(["number", "boolean", "choice"]).default("number"),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  default: z.union([z.number(), z.boolean(), z.string()]),
  description: z.string().optional(),
  choices: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
});

/** Combinação nomeada de valores — o atalho para um cenário conhecido. */
export const presetSchema = z.object({
  key: z.string(),
  label: z.string(),
  values: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])),
});

/** Um valor calculado que a interface exibe como mostrador. */
export const outputSpecSchema = z.object({
  key: z.string(),
  label: z.string(),
  unit: z.string().optional().default(""),
  precision: z.number().int().min(0).max(6).default(2),
});

export const chartSpecSchema = z.object({
  key: z.string(),
  label: z.string(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
});

export const moduleSpecSchema = z
  .object({
    version: z.string().default("1.0.0"),
    modelVersion: z.string().default("1.0.0"),
    view: z
      .object({
        renderer: z.enum(["canvas", "svg", "webgl", "none"]).default("none"),
        aspectRatio: z.string().default("4/3"),
      })
      .default({ renderer: "none", aspectRatio: "4/3" }),
    parameters: z.array(parameterSpecSchema).default([]),
    presets: z.array(presetSchema).default([]),
    outputs: z.array(outputSpecSchema).default([]),
    charts: z.array(chartSpecSchema).default([]),
  })
  // Chaves desconhecidas passam adiante: `hotspots` do módulo de foguete não é
  // problema do núcleo, mas o componente precisa recebê-las.
  .passthrough();

export type ParameterSpec = z.infer<typeof parameterSpecSchema>;
export type Preset = z.infer<typeof presetSchema>;
export type OutputSpec = z.infer<typeof outputSpecSchema>;
export type ChartSpec = z.infer<typeof chartSpecSchema>;
export type ModuleSpec = z.infer<typeof moduleSpecSchema>;

/** Valores correntes das variáveis, indexados pela `key` do parâmetro. */
export type ParameterValues = Record<string, number | boolean | string>;

export interface ModuleComponentProps {
  module: ScienceModule;
  spec: ModuleSpec;
}

/**
 * O que um módulo declara sobre si.
 *
 * `capabilities` não é decoração: o shell usa isso para decidir o layout antes
 * de o componente carregar — se há simulação, reserva espaço para o painel de
 * controle; se há gráficos, reserva a faixa inferior.
 */
export type ModuleCapability =
  | "simulation"
  | "dataset"
  | "3d"
  | "timeline"
  | "hotspots";

export interface ModuleDefinition {
  key: string;
  capabilities: ModuleCapability[];
  Component: ComponentType<ModuleComponentProps>;
}

/**
 * Lê o `spec` cru vindo da API.
 *
 * Nunca lança: um `spec` malformado degrada o módulo para "sem parâmetros" em
 * vez de derrubar a página inteira. O conteúdo é editorial, e conteúdo
 * editorial erra.
 */
export function parseModuleSpec(raw: unknown): ModuleSpec {
  const result = moduleSpecSchema.safeParse(raw ?? {});

  if (result.success) {
    return result.data;
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn("[orbital] spec de módulo inválido:", result.error.issues);
  }

  return moduleSpecSchema.parse({});
}

/** Valores iniciais a partir dos defaults declarados no `spec`. */
export function defaultValues(spec: ModuleSpec): ParameterValues {
  return Object.fromEntries(
    spec.parameters.map((parameter) => [parameter.key, parameter.default]),
  );
}
