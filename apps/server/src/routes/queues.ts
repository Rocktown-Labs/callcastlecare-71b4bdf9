/* eslint-disable import/no-relative-parent-imports */
import { handleCallback } from "@vercel/queue";
import { Hono } from "hono";

import type { AppEnv } from "../types";
import { runDispatchRetryWorkflow } from "../workflows/dispatch-retry";
import { runOutboxDeliveryWorkflow } from "../workflows/outbox-delivery";
import { runTipReleaseWorkflow } from "../workflows/tip-release";

const dispatchRetryCallback = handleCallback<{
  orderId: number;
  sequence?: number;
}>(async (payload) => {
  await runDispatchRetryWorkflow(payload);
});

const outboxDeliveryCallback = handleCallback<{
  outboxEventId: number;
}>(async (payload) => {
  await runOutboxDeliveryWorkflow(payload);
});

const tipReleaseCallback = handleCallback<{
  orderId?: number;
}>(async (payload) => {
  await runTipReleaseWorkflow(payload);
});

export const queueRoutes = new Hono<AppEnv>()
  .post("/dispatch", (c) => dispatchRetryCallback(c.req.raw))
  .post("/outbox", (c) => outboxDeliveryCallback(c.req.raw))
  .post("/tip-release", (c) => tipReleaseCallback(c.req.raw));
