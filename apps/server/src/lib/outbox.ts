import { createHash } from "node:crypto";

import { db } from "@callcastlecare/db";
import { outboxEvents } from "@callcastlecare/db/schema/index";

import { logger } from "./logger";
import { enqueueMessage, QUEUE_TOPICS } from "./queue";

export const createOutboxEventKey = (
  eventName: string,
  payload: Record<string, unknown>
) => {
  const hash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 20);
  return `${eventName}:${hash}`;
};

export const publishOutboxEvent = async (input: {
  eventKey?: string;
  eventName: string;
  payload: Record<string, unknown>;
}) => {
  const eventKey =
    input.eventKey ?? createOutboxEventKey(input.eventName, input.payload);

  const inserted = await db
    .insert(outboxEvents)
    .values({
      eventKey,
      eventName: input.eventName,
      payloadJson: input.payload,
      status: "pending",
    })
    .onConflictDoNothing({
      target: outboxEvents.eventKey,
    })
    .returning({ id: outboxEvents.id });

  const created = inserted[0];
  if (!created) {
    logger.info({ eventKey, eventName: input.eventName }, "outbox:duplicate");
    return;
  }

  await enqueueMessage(QUEUE_TOPICS.outboxDelivery, {
    outboxEventId: created.id,
  });
};
