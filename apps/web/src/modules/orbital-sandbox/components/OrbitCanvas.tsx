"use client";

import { useEffect, useRef } from "react";
import { BODY_RADIUS, type OrbitSimulator } from "../simulation/orbit";

/**
 * Desenho da trajetória em canvas 2D.
 *
 * Canvas, e não SVG: o rastro chega a milhares de pontos e é redesenhado a
 * 60 fps. Em SVG isso seriam milhares de nós do DOM sendo recriados a cada
 * quadro — o navegador não sustenta.
 *
 * O componente não tem estado React nenhum: recebe o simulador por ref e
 * desenha o que existe ali no momento do quadro. Manter a trajetória em estado
 * React causaria um render por quadro sem qualquer benefício.
 */
export function OrbitCanvas({
  simulator,
  frameSignal,
}: {
  simulator: OrbitSimulator | null;
  /** Muda a cada quadro do laço de simulação, forçando um redesenho. */
  frameSignal: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simulator) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Densidade de pixel do dispositivo: sem isso, a linha de 1px fica borrada
    // em telas retina.
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;
    const cx = width / 2;
    const cy = height / 2;

    // O canvas não entende variáveis CSS — é preciso resolvê-las antes.
    // Fazer isso aqui mantém o desenho fiel ao tema, inclusive quando a
    // disciplina troca o acento da página.
    const accent =
      getComputedStyle(canvas).getPropertyValue("--accent").trim() ||
      "oklch(0.78 0.13 210)";

    // Escala: o maior valor entre o rastro e o raio inicial cabe na tela com
    // folga. Recalculada por quadro para que a órbita não escape do quadro
    // quando o usuário aumenta a velocidade.
    let maxRadius = simulator.initialRadius * 1.2;

    for (const point of simulator.trail) {
      const r = Math.hypot(point.x, point.y);
      if (r > maxRadius) maxRadius = r;
    }

    const scale = (Math.min(width, height) / 2 - 16) / maxRadius;

    context.clearRect(0, 0, width, height);

    // Corpo central.
    context.beginPath();
    context.arc(cx, cy, BODY_RADIUS * scale, 0, Math.PI * 2);
    context.fillStyle = "oklch(0.30 0.04 255)";
    context.fill();
    context.strokeStyle = "oklch(0.45 0.05 255)";
    context.lineWidth = 1;
    context.stroke();

    // Rastro.
    const trail = simulator.trail;

    if (trail.length > 1) {
      context.beginPath();
      context.moveTo(cx + trail[0].x * scale, cy - trail[0].y * scale);

      for (let i = 1; i < trail.length; i += 1) {
        context.lineTo(cx + trail[i].x * scale, cy - trail[i].y * scale);
      }

      context.strokeStyle = accent;
      context.globalAlpha = 0.75;
      context.lineWidth = 1.25;
      context.stroke();
      context.globalAlpha = 1;
    }

    // Veículo.
    const { position, impacted } = simulator.current;
    const px = cx + position.x * scale;
    const py = cy - position.y * scale;

    context.beginPath();
    context.arc(px, py, 4, 0, Math.PI * 2);
    context.fillStyle = impacted ? "oklch(0.68 0.18 25)" : "oklch(0.96 0.005 255)";
    context.fill();
  }, [simulator, frameSignal]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      // O canvas é decorativo do ponto de vista de acessibilidade: os mesmos
      // números estão nos mostradores, que são texto de verdade.
      role="presentation"
    />
  );
}
