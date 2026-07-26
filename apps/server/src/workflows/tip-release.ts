/* eslint-disable import/no-relative-parent-imports */
import { releaseEligibleTipHolds } from "../lib/payouts";

export interface TipReleasePayload {
  orderId?: number;
}

export const runTipReleaseWorkflow = async (payload: TipReleasePayload) => {
  await releaseEligibleTipHolds(payload.orderId);
};
