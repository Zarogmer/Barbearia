import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Em testes Node, "server-only" nao existe — stub vazio impede o
      // throw que esse pacote dispara fora do bundler do Next.
      "server-only": resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    // Carrega .env.test pra integration tests (DATABASE_URL aponta pro
    // Postgres do docker-compose.test.yml).
    setupFiles: ["./tests/setup-env.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/mock-data.ts",
        "src/lib/db.ts",
        "**/*.d.ts",
        "**/*.test.ts",
      ],
      // Thresholds informativos (sem fail) por enquanto. Quando suite
      // crescer, virar enforce conforme docs/05-testes.md.
      // thresholds: { lines: 70, statements: 70 },
    },
  },
});
