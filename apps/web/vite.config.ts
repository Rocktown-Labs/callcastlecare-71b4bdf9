import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const browserManualChunks = (id: string) => {
  if (!id.includes("node_modules")) {
    return;
  }
  if (id.includes("@vercel/blob")) {
    return "vercel-blob";
  }
  if (id.includes("better-auth") || id.includes("@better-auth-ui")) {
    return "auth-vendor";
  }
  if (id.includes("@tanstack")) {
    return "tanstack-vendor";
  }
  if (id.includes("lucide-react")) {
    return "icons-vendor";
  }
  if (id.includes("react-dom")) {
    return "react-dom-vendor";
  }
  if (id.includes("/react/") || id.includes("\\react\\")) {
    return "react-vendor";
  }
  return "vendor";
};

export default defineConfig({
  environments: {
    client: {
      build: {
        rolldownOptions: {
          output: {
            manualChunks: browserManualChunks,
          },
        },
      },
    },
  },
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
