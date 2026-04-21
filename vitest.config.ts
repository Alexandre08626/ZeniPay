import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["lib/agents/**/*.test.ts"],
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      include: ["lib/agents/**/*.ts"],
      exclude: ["lib/agents/**/*.test.ts", "lib/agents/**/types.ts"],
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
