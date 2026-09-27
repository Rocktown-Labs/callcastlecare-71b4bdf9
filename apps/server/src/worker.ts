import type { ExportedHandler } from "@cloudflare/workers-types";

import { app } from "./app";
import type { QueueMessageEnvelope } from "./lib/queue";
import { handleQueueBatch } from "./queue-handler";
import type { AppEnv } from "./types";

const handler: ExportedHandler<
  AppEnv["Bindings"],
  QueueMessageEnvelope<unknown>
> = {
  fetch: app.fetch,
  queue: handleQueueBatch,
};

export default handler;
