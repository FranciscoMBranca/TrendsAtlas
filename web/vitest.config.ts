import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    environment: "jsdom",
    globals: true,
    // A fake API address: tests stub fetch, nothing is called for real.
    env: { NEXT_PUBLIC_API_URL: "http://api.test" },
    testTimeout: 20000,
    setupFiles: ["./test/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "components/**/*.test.tsx", "lib/**/*.test.ts"],
  },
});
