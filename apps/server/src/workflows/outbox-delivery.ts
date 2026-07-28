/* eslint-disable import/no-relative-parent-imports */
import { processOutboxEvent } from "../lib/notifications";

export interface OutboxDeliveryPayload {
  outboxEventId: number;
}

export const runOutboxDeliveryWorkflow = async (
  payload: OutboxDeliveryPayload
) => {
  if (!payload.outboxEventId || !Number.isInteger(payload.outboxEventId)) {
    return;
  }

  await processOutboxEvent(payload.outboxEventId);
};
