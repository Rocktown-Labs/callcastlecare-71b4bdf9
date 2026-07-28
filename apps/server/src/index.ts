import { serve } from "@hono/node-server";

// eslint-disable-next-line unicorn/prefer-export-from -- The server entry needs the local app value for the dev server.
import { app } from "./app";

export { type ApiType, type AppType } from "./app";
export default app;

if (!process.env.VERCEL) {
  serve(
    {
      fetch: app.fetch,
      port: 3000,
    },
    (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
    }
  );
}
