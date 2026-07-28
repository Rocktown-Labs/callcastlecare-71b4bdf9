import { Hono } from "hono";

import type { AppEnv } from "../types";
import { handleStripeWebhook } from "./checkout";

export const webhookRoutes = new Hono<AppEnv>().post(
  "/stripe",
  handleStripeWebhook
);
