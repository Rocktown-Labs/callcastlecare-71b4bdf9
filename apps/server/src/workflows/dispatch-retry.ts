/* eslint-disable import/no-relative-parent-imports */
import { dispatchOrder, expirePendingOffers } from "../lib/dispatch";

export interface DispatchRetryPayload {
  orderId: number;
  sequence?: number;
}

export const runDispatchRetryWorkflow = async (
  payload: DispatchRetryPayload
) => {
  if (!payload.orderId || !Number.isInteger(payload.orderId)) {
    return;
  }

  await expirePendingOffers(payload.orderId);
  await dispatchOrder({
    orderId: payload.orderId,
    sequence: payload.sequence,
  });
};
