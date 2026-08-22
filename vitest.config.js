import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.js"],
      exclude: ["src/seed/**", "tests/**"],
      // Meta de quality gate: 90% (lines/functions/branches/statements).
      // Se ACTIVA en la fase de cierre, no ahora: con una sola unidad un umbral
      // global del 90% haria fallar la suite artificialmente.
    },
  },
});
