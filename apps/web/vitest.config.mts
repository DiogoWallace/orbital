import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest cobre a camada de simulação: TypeScript puro, sem DOM, sem React
 * (ADR 0007). Testes de componente e de fluxo entram depois, com ferramentas
 * próprias — misturar tudo num só runner é o que torna a suíte lenta.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
