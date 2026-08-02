import { defineConfig } from "tsdown";

// Vercel's file tracing misses packages installed through bun's isolated
// node_modules layout, so the deployed function must be fully self-contained.
// Bundle every runtime dependency instead of relying on node_modules at runtime.
export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: [/.*/u],
    onlyBundle: false,
  },
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
});
