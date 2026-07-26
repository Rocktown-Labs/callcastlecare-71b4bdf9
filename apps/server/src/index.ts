import { serve } from "@hono/node-server";

import { app } from "./app";

export type { AppType } from "./app";
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
