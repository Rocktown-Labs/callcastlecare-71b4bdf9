import { logger } from "./logger";

export const QUEUE_TOPICS = {
  dispatchRetry: "dispatch_retry",
  outboxDelivery: "outbox_delivery",
  tipRelease: "tip_release",
} as const;

export type QueueTopic = (typeof QUEUE_TOPICS)[keyof typeof QUEUE_TOPICS];

export interface QueueMessageEnvelope<TPayload> {
  payload: TPayload;
  topic: QueueTopic;
  version: number;
}

let queueInstance: Queue | undefined;

export const configureQueue = (queue: Queue | undefined) => {
  queueInstance = queue;
};

export const getQueue = (): Queue | undefined => queueInstance;

export const enqueueMessage = async <TPayload>(
  topic: QueueTopic,
  payload: TPayload,
  options?: { delaySeconds?: number }
) => {
  const queue = queueInstance;

  if (!queue) {
    logger.error(
      {
        payload,
        topic,
      },
      "queue:not_configured"
    );
    return;
  }

  const envelope: QueueMessageEnvelope<TPayload> = {
    payload,
    topic,
    version: 1,
  };

  try {
    await queue.send(envelope, {
      delaySeconds: options?.delaySeconds,
    });
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
