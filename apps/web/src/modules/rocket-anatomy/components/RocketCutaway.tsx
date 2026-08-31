"use client";

import { useEffect, useRef } from "react";
import { CHROME, SHAPE_BY_KEY, VIEWBOX, type PartShape } from "../data/geometry";

/**
 * O corte do veículo, com cada sistema selecionável.
 *
 * A escolha por SVG não é estética: cada peça é um nó do DOM, então ela é
 * clicável, focável e anunciável sem nenhuma camada de acessibilidade
 * inventada por cima. Um canvas teria exigido reconstruir tudo isso à mão.
 *
 * O padrão de teclado é o de um grupo de rádio, e não doze botões: os sistemas
 * são mutuamente exclusivos — há sempre um, e só um, em evidência. Isso dá
 * **uma** parada de tabulação para o desenho inteiro, com as setas percorrendo
 * as peças. Doze paradas seguidas obrigariam quem navega por teclado a
 * atravessar o foguete peça por peça só para chegar ao texto.
 */
export function RocketCutaway({
  parts,
  selected,
  onSelect,
}: {
  /** Só os sistemas que existem no `spec` **e** têm geometria. */
  parts: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const refs = useRef(new Map<string, SVGGElement>());
  /**
   * Mover o foco é resposta a tecla, não a toda mudança de seleção — clicar
   * numa peça e ser jogado para outro lugar seria hostil, e roubar o foco de
   * quem está lendo o texto ao lado, pior ainda.
   */
  const focusNext = useRef(false);

  useEffect(() => {
    if (!focusNext.current) return;

    focusNext.current = false;
    refs.current.get(selected)?.focus();
  }, [selected]);

  function moverPara(indice: number) {
    const destino = parts[(indice + parts.length) % parts.length];

    if (!destino) return;

    focusNext.current = true;
    onSelect(destino.key);
  }

  function aoTeclar(event: React.KeyboardEvent, indice: number) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        moverPara(indice + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        moverPara(indice - 1);
        break;
      case "Home":
        event.preventDefault();
        moverPara(0);
        break;
      case "End":
        event.preventDefault();
        moverPara(parts.length - 1);
        break;
      case " ":
      case "Enter":
        event.preventDefault();
        onSelect(parts[indice].key);
        break;
    }
  }

  const emEvidencia = SHAPE_BY_KEY[selected];
  const rotulo = parts.find((part) => part.key === selected)?.label;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      className="h-full w-full"
      // O desenho é o conteúdo, não decoração: ele precisa de nome acessível.
      role="img"
      aria-label="Corte esquemático de um veículo lançador"
    >
      <g
        stroke="var(--color-neutral-700)"
        strokeWidth={0.8}
        fill="none"
        strokeLinecap="round"
      >
        <path d={CHROME.skin} />
        <path d={CHROME.axis} strokeDasharray="2 4" opacity={0.5} />
      </g>

      <g role="radiogroup" aria-label="Sistemas do veículo">
        {parts.map((part, indice) => {
          const shape = SHAPE_BY_KEY[part.key];
          const ativo = part.key === selected;

          return (
            <g
              key={part.key}
              ref={(node) => {
                if (node) refs.current.set(part.key, node);
                else refs.current.delete(part.key);
              }}
              role="radio"
              aria-checked={ativo}
              aria-label={part.label}
              tabIndex={ativo ? 0 : -1}
              onClick={() => onSelect(part.key)}
              onKeyDown={(event) => aoTeclar(event, indice)}
              className="cursor-pointer outline-none [&:focus-visible_.peca]:stroke-[var(--color-accent-300)]"
            >
              <Peca shape={shape} ativo={ativo} />
            </g>
          );
        })}
      </g>

      {emEvidencia && rotulo ? <Chamada shape={emEvidencia} rotulo={rotulo} /> : null}
    </svg>
  );
}

function Peca({ shape, ativo }: { shape: PartShape; ativo: boolean }) {
  const traco = ativo ? "var(--color-accent)" : "var(--color-neutral-600)";

  if (shape.stroke) {
    return (
      <>
        {/* Alvo invisível: um traço de 1px é impossível de acertar no toque. */}
        <path d={shape.d} stroke="transparent" strokeWidth={14} fill="none" />
        <path
          className="peca transition-[stroke] duration-150 motion-reduce:transition-none"
          d={shape.d}
          stroke={traco}
          strokeWidth={ativo ? 2.4 : 1.6}
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  }

  return (
    <>
      <path
        className="peca transition-[fill,stroke] duration-150 motion-reduce:transition-none"
        d={shape.d}
        fill={ativo ? "color-mix(in srgb, var(--color-accent) 22%, transparent)" : "var(--color-surface)"}
        stroke={traco}
        strokeWidth={ativo ? 1.8 : 1}
      />
      {shape.detail ? (
        <path
          d={shape.detail}
          fill="none"
          stroke={ativo ? "var(--color-accent-300)" : "var(--color-neutral-600)"}
          strokeWidth={0.8}
          strokeLinecap="round"
          // Detalhe é desenho, não alvo: deixá-lo clicável criaria buracos
          // dentro da própria peça.
          pointerEvents="none"
        />
      ) : null}
    </>
  );
}

/** Linha de chamada com o nome do sistema em evidência. */
function Chamada({ shape, rotulo }: { shape: PartShape; rotulo: string }) {
  const paraEsquerda = shape.labelAt.side === "left";
  const fim = paraEsquerda ? shape.labelAt.x - 22 : shape.labelAt.x + 22;

  return (
    <g pointerEvents="none">
      <path
        d={`M${shape.labelAt.x} ${shape.labelAt.y} H${fim}`}
        stroke="var(--color-accent)"
        strokeWidth={0.8}
      />
      <circle cx={shape.labelAt.x} cy={shape.labelAt.y} r={1.8} fill="var(--color-accent)" />
      <text
        x={paraEsquerda ? fim - 4 : fim + 4}
        y={shape.labelAt.y + 3}
        textAnchor={paraEsquerda ? "end" : "start"}
        fill="var(--color-text)"
        fontSize={8}
        letterSpacing={0.4}
      >
        {rotulo}
      </text>
    </g>
  );
}
