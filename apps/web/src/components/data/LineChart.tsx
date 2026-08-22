"use client";

import { useId } from "react";
import { formatNumber } from "@/lib/utils";

export interface ChartPoint {
  x: number;
  y: number;
}

/**
 * Gráfico de linha em SVG puro.
 *
 * Sem biblioteca de gráficos nesta fase de propósito: uma linha com eixos e
 * grade cabe em cem linhas, e adicionar uma dependência de charting antes de
 * precisar de escala logarítmica, barra de erro ou brush seria peso sem retorno.
 * Quando esses requisitos chegarem, `@visx` entra aqui — e apenas aqui, porque
 * os módulos consomem este componente, não a biblioteca.
 */
export function LineChart({
  points,
  xLabel,
  yLabel,
  height = 180,
  className,
}: {
  points: ChartPoint[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  className?: string;
}) {
  const clipId = useId();

  const width = 640;
  const padding = { top: 12, right: 12, bottom: 28, left: 52 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  if (points.length < 2) {
    return (
      <div
        className={className}
        style={{ height }}
        role="img"
        aria-label={`${yLabel ?? "Série"} — aguardando dados`}
      >
        <p className="flex h-full items-center justify-center text-xs text-[var(--color-ink-faint)]">
          Inicie a simulação para gerar a série.
        </p>
      </div>
    );
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  // Faixa mínima evita que uma série constante vire divisão por zero e desenhe
  // uma linha no infinito.
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const toX = (value: number) => padding.left + ((value - xMin) / xRange) * innerWidth;
  const toY = (value: number) =>
    padding.top + innerHeight - ((value - yMin) / yRange) * innerHeight;

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${toX(point.x)},${toY(point.y)}`)
    .join(" ");

  const yTicks = [yMin, yMin + yRange / 2, yMax];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`${yLabel ?? "Série"} em função de ${xLabel ?? "tempo"}`}
      preserveAspectRatio="none"
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={padding.left}
            y={padding.top}
            width={innerWidth}
            height={innerHeight}
          />
        </clipPath>
      </defs>

      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={toY(tick)}
            y2={toY(tick)}
            stroke="var(--color-line)"
            strokeWidth={1}
          />
          <text
            x={padding.left - 8}
            y={toY(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            fill="var(--color-ink-faint)"
          >
            {formatNumber(tick, Math.abs(tick) >= 100 ? 0 : 1)}
          </text>
        </g>
      ))}

      <path
        d={path}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        clipPath={`url(#${clipId})`}
      />

      {xLabel ? (
        <text
          x={width / 2}
          y={height - 6}
          textAnchor="middle"
          fontSize={10}
          fill="var(--color-ink-faint)"
        >
          {xLabel}
        </text>
      ) : null}
    </svg>
  );
}
