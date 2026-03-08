// @ts-nocheck
import * as path from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import testConfig from "./env.test";

const defineEntries = Object.fromEntries(
  Object.entries(testConfig).map(([key, value]) => [key, JSON.stringify(value)]),
);

defineEntries.global = "window";

export default defineConfig({
  define: defineEntries,
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.dev.json"] }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setupTests.ts"],
    css: true,
    globals: true,
    restoreMocks: true,
    clearMocks: true,
  },
});
