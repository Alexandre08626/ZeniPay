import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["lib/agents/**/*.test.ts", "lib/zenicore/**/*.test.ts", "lib/payroll/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      include: ["lib/agents/**/*.ts", "lib/zenicore/**/*.ts", "lib/payroll/**/*.ts"],
      exclude: [
        "lib/agents/**/*.test.ts", "lib/agents/**/types.ts",
        "lib/zenicore/**/*.test.ts", "lib/zenicore/**/types.ts",
        "lib/zenicore/funding-types.ts",
        "lib/payroll/**/*.test.ts", "lib/payroll/types.ts",
      ],
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
