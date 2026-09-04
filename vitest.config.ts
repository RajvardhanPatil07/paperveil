import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost" } },
    globals: true,
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
});
