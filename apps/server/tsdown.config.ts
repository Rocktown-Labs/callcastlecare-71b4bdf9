import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  entry: "./src/index.ts",
  format: "esm",
  noExternal: [/@callcastlecare\/.*/u, "@hono/node-server"],
  outDir: "./dist",
});
