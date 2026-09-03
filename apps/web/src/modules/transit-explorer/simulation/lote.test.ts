import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyse } from "./analysis";
import type { LightCurve } from "./synthetic";

/**
 * Analisador em lote — roda o método sobre um conjunto rotulado inteiro.
 *
 * Só executa quando `ORBITAL_LOTE` aponta para uma pasta produzida pelo
 * `tools/tess/lote-baixar.py`. Sem a variável, o arquivo é ignorado e a suíte
 * normal não paga nada por ele:
 *
 *     ORBITAL_LOTE=/caminho/tess-lote npx vitest run src/modules/transit-explorer/simulation/lote.test.ts
 *
 * **Por que um arquivo de teste, e não um script.** Este é o mesmo código que
 * roda no navegador — não uma reimplementação para uso em lote. Manter uma só
 * implementação é o ponto: a linha de base medida aqui é exatamente o que o
 * usuário vê na tela. O runner de teste é o único que já resolve TypeScript e
 * os aliases do projeto sem acrescentar dependência nenhuma, e por isso ele é
 * usado como executor. Se um dia entrar um `tsx` ou equivalente no projeto,
 * isto vira um script e nada mais muda.
 *
 * A saída é `resultados.csv` na mesma pasta: uma linha por alvo, com o rótulo
 * do catálogo ao lado das features medidas. É o substrato da linha de base — e
 * de qualquer modelo que venha depois.
 */

const PASTA = process.env.ORBITAL_LOTE;

function lerCsv(caminho: string): Record<string, string>[] {
  // O módulo `csv` do Python termina linha em CRLF por padrão, mesmo no Linux.
  // Sem remover o `\r`, o último nome de coluna vira `arquivo\r` e a leitura
  // devolve `undefined` sem erro nenhum — o tipo de falha que só aparece três
  // camadas depois.
  const linhas = readFileSync(caminho, "utf-8")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  const cabecalho = linhas[0].split(",");

  return linhas.slice(1).map((linha) => {
    // O manifesto não tem vírgula dentro de campo — uma divisão simples basta,
    // e evita um parser inteiro aqui.
    const celulas = linha.split(",");

    return Object.fromEntries(cabecalho.map((chave, i) => [chave, celulas[i] ?? ""]));
  });
}

function carregar(caminho: string): LightCurve {
  const bruto = JSON.parse(readFileSync(caminho, "utf-8"));

  return {
    time: Float64Array.from(bruto.tempo),
    flux: Float64Array.from(bruto.fluxo),
    // Ausentes nas curvas antigas; a métrica trata a falta como não medido.
    centroidCol: bruto.centroideCol ? Float64Array.from(bruto.centroideCol) : undefined,
    centroidRow: bruto.centroideLinha ? Float64Array.from(bruto.centroideLinha) : undefined,
  };
}

function numero(valor: string | undefined): number | null {
  if (!valor) return null;

  const convertido = Number(valor);

  return Number.isFinite(convertido) ? convertido : null;
}

describe.skipIf(!PASTA)("análise em lote", () => {
  it("mede as features de cada alvo rotulado", () => {
    const pasta = PASTA as string;
    const manifesto = lerCsv(join(pasta, "manifesto.csv"));

    expect(manifesto.length).toBeGreaterThan(0);

    const colunas = [
      "tic",
      "toi",
      "rotulo",
      "disposicao",
      "periodo_publicado",
      "profundidade_publicada_ppm",
      "periodo_recuperado",
      "erro_periodo_rel",
      "profundidade_pct",
      "duracao_h",
      "snr",
      "pico",
      "secundario_pct",
      "odd_even",
      "forma",
      "centroide",
      "pontos",
    ];

    const saida: string[] = [colunas.join(",")];
    const porClasse: Record<string, number[][]> = {};

    for (const alvo of manifesto) {
      const caminho = join(pasta, "curvas", alvo.arquivo);

      if (!existsSync(caminho)) continue;

      const curva = carregar(caminho);

      const r = analyse(curva, {
        detrendWindowDays: 0.5,
        bls: { minPeriod: 0.5, maxPeriod: 9, periodCount: 1500, bins: 180 },
      });

      const c = r.candidate;
      const publicado = numero(alvo.periodo_publicado);
      const recuperado = c?.period ?? 0;

      // O BLS acha aliases: metade e o dobro do período verdadeiro produzem
      // dobras coerentes. Contar isso como erro grosseiro esconderia que o
      // método encontrou o sinal certo na harmônica errada.
      const erro =
        publicado && recuperado
          ? Math.min(
              ...[0.5, 1, 2].map((fator) =>
                Math.abs(recuperado - publicado * fator) / (publicado * fator),
              ),
            )
          : Number.NaN;

      const linha = [
        alvo.tic,
        alvo.toi,
        alvo.rotulo,
        alvo.disposicao,
        alvo.periodo_publicado,
        alvo.profundidade_publicada_ppm,
        recuperado.toFixed(5),
        Number.isFinite(erro) ? erro.toFixed(5) : "",
        ((c?.depth ?? 0) * 100).toFixed(4),
        ((c?.durationDays ?? 0) * 24).toFixed(3),
        r.snr.toFixed(2),
        ((c?.power ?? 0) * 1000).toFixed(4),
        (r.secondaryDepth * 100).toFixed(4),
        r.oddEven.toFixed(4),
        r.shapeRatio.toFixed(4),
        r.centroid.toFixed(4),
        String(curva.time.length),
      ];

      saida.push(linha.join(","));

      porClasse[alvo.rotulo] ??= [];
      porClasse[alvo.rotulo].push([
        (c?.depth ?? 0) * 100,
        r.snr,
        (c?.power ?? 0) * 1000,
        r.secondaryDepth * 100,
        r.oddEven,
        r.shapeRatio,
        r.centroid,
        Number.isFinite(erro) ? erro : Number.NaN,
      ]);
    }

    writeFileSync(join(pasta, "resultados.csv"), `${saida.join("\n")}\n`, "utf-8");

    const mediana = (valores: number[]): number => {
      const limpos = valores.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);

      if (limpos.length === 0) return Number.NaN;

      return limpos[Math.floor(limpos.length / 2)];
    };

    const nomes = ["profundidade %", "S/R", "pico e-3", "secundário %", "odd-even", "forma", "centroide", "erro período"];

    console.log(`\n${saida.length - 1} alvos analisados -> resultados.csv\n`);
    console.log(`${"".padEnd(16)}${nomes.map((n) => n.padStart(15)).join("")}`);

    for (const [rotulo, valores] of Object.entries(porClasse)) {
      const medianas = nomes.map((_, coluna) =>
        mediana(valores.map((linha) => linha[coluna])),
      );

      console.log(
        `${`${rotulo} (${valores.length})`.padEnd(16)}` +
          medianas.map((m) => (Number.isFinite(m) ? m.toFixed(3) : "—").padStart(15)).join(""),
      );
    }

    expect(saida.length).toBeGreaterThan(1);
  }, 600_000);
});
