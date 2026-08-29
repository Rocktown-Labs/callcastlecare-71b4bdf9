import { serve } from "@hono/node-server";

import { app } from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env.PORT ?? 3000);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info: { port: number }) => {
    logger.info({ port: info.port }, "server:listening");
  }
);
