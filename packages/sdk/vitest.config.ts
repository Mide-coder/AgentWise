import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    // sql.js loads WASM — give it enough time
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run tests serially so each gets a clean in-memory DB
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
