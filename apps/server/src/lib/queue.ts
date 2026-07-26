import type { SendOptions } from "@vercel/queue";
import { send } from "@vercel/queue";

import { logger } from "./logger";

export const QUEUE_TOPICS = {
  dispatchRetry: "dispatch_retry",
  outboxDelivery: "outbox_delivery",
  tipRelease: "tip_release",
} as const;

export type QueueTopic = (typeof QUEUE_TOPICS)[keyof typeof QUEUE_TOPICS];

export const enqueueMessage = async <TPayload>(
  topic: QueueTopic,
  payload: TPayload,
  options?: SendOptions
) => {
  try {
    await send(topic, payload, options);
  } catch (error) {
    logger.error(
      {
        error,
        options,
        payload,
        topic,
      },
      "queue:enqueue:failed"
    );
  }
};
