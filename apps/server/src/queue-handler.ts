import { configureAuth } from "@callcastlecare/auth";
import type { AuthConfig } from "@callcastlecare/auth";
import { configureDatabase, db } from "@callcastlecare/db";
import { setRuntimeEnvSource } from "@callcastlecare/env/server";
import type { ExportedHandlerQueueHandler } from "@cloudflare/workers-types";

import { logger } from "./lib/logger";
import { configureQueue } from "./lib/queue";
import type { QueueMessageEnvelope } from "./lib/queue";
import type { AppEnv } from "./types";
import { runDispatchRetryWorkflow } from "./workflows/dispatch-retry";
import type { DispatchRetryPayload } from "./workflows/dispatch-retry";
import { runOutboxDeliveryWorkflow } from "./workflows/outbox-delivery";
import type { OutboxDeliveryPayload } from "./workflows/outbox-delivery";
import { runTipReleaseWorkflow } from "./workflows/tip-release";
import type { TipReleasePayload } from "./workflows/tip-release";

type WorkerConfigResult = { ok: true } | { ok: false; error: string };

const configureWorkerServices = (env: unknown): WorkerConfigResult => {
  const record = env as Record<string, string | undefined>;
  const databaseUrl = record.DATABASE_URL;

  if (!databaseUrl) {
    return { error: "DATABASE_URL is not configured", ok: false };
  }

  try {
    configureDatabase(databaseUrl);
    configureAuth(record as unknown as AuthConfig, db);
    configureQueue(
      (record as Record<string, unknown>).QUEUE as Queue | undefined
    );
    setRuntimeEnvSource(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, "queue:configuration_failed");
    return { error: message, ok: false };
  }

  return { ok: true };
};

const handleMessage = async (envelope: QueueMessageEnvelope<unknown>) => {
  switch (envelope.topic) {
    case "dispatch_retry": {
      await runDispatchRetryWorkflow(envelope.payload as DispatchRetryPayload);
      break;
    }
    case "outbox_delivery": {
      await runOutboxDeliveryWorkflow(
        envelope.payload as OutboxDeliveryPayload
      );
      break;
    }
    case "tip_release": {
      await runTipReleaseWorkflow(envelope.payload as TipReleasePayload);
      break;
    }
    default: {
      logger.warn({ topic: envelope.topic }, "queue:unknown_topic");
    }
  }
};

export const handleQueueBatch: ExportedHandlerQueueHandler<
  AppEnv["Bindings"],
  QueueMessageEnvelope<unknown>
> = async (batch, env) => {
  const config = configureWorkerServices(env);

  if (!config.ok) {
    batch.retryAll();
    return;
  }

  await Promise.all(
    batch.messages.map(async (message) => {
      try {
        await handleMessage(message.body);
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
            messageId: message.id,
            topic: message.body.topic,
          },
          "queue:message:failed"
        );
        message.retry();
      }
    })
  );
};
