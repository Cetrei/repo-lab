import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Relative base, so the same build works on a project page (https://user.github.io/repo-lab/) and locally.
export default defineConfig({
  base: "./",
  plugins: [react()],
  worker: { format: "es" },
  build: { target: "es2022", sourcemap: false },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});
