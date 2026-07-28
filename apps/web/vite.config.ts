import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3001,
  },
  // Bundle workspace packages for SSR while letting Vite handle third-party deps.
  ssr: {
    noExternal: [/^@callcastlecare\//u],
  },
});
