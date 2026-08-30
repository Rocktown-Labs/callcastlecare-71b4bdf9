import { env } from "@callcastlecare/env/server";
import type { Context } from "hono";
import { Hono } from "hono";
import { Resend } from "resend";
import type { WebhookEventPayload } from "resend";

import type { StripeWebhookEndpointKind } from "../lib/integrations/stripe-client";
import { logger } from "../lib/logger";
import type { AppEnv } from "../types";
import { createStripeWebhookHandler } from "./checkout";

const getResendClient = () =>
  env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const getResendWebhookHeaders = (request: Request) => {
  const id = request.headers.get("svix-id");
  const signature = request.headers.get("svix-signature");
  const timestamp = request.headers.get("svix-timestamp");

  if (!(id && signature && timestamp)) {
    return null;
  }

  return {
    id,
    signature,
    timestamp,
  };
};

const getResendEventLogFields = (event: WebhookEventPayload) => {
  const baseFields = {
    eventCreatedAt: event.created_at,
    eventType: event.type,
  };

  if ("email_id" in event.data) {
    return {
      ...baseFields,
      attachmentCount:
        "attachments" in event.data ? event.data.attachments.length : 0,
      emailId: event.data.email_id,
      receivedForCount:
        "received_for" in event.data ? event.data.received_for.length : 0,
      subject: event.data.subject,
      toCount: event.data.to.length,
    };
  }

  if ("email" in event.data) {
    return {
      ...baseFields,
      audienceId: event.data.audience_id,
      contactEmail: event.data.email,
      contactId: event.data.id,
    };
  }

  return {
    ...baseFields,
    domainId: event.data.id,
    domainName: event.data.name,
    domainStatus: event.data.status,
  };
};

export const handleResendWebhook = async (c: Context<AppEnv>) => {
  if (!env.RESEND_WEBHOOK_SECRET) {
    logger.error(
      {
        requestId: c.get("requestId"),
      },
      "resend_webhook:missing_secret"
    );
    return c.json({ error: "Resend webhook secret is not configured" }, 503);
  }

  const resend = getResendClient();
  if (!resend) {
    logger.error(
      {
        requestId: c.get("requestId"),
      },
      "resend_webhook:missing_api_key"
    );
    return c.json({ error: "Resend API key is not configured" }, 503);
  }

  const headers = getResendWebhookHeaders(c.req.raw);
  if (!headers) {
    logger.warn(
      {
        requestId: c.get("requestId"),
      },
      "resend_webhook:missing_signature_headers"
    );
    return c.json({ error: "Missing Resend webhook signature headers" }, 400);
  }

  const payload = await c.req.text();

  try {
    const event = resend.webhooks.verify({
      headers,
      payload,
      webhookSecret: env.RESEND_WEBHOOK_SECRET,
    });

    logger.info(
      {
        ...getResendEventLogFields(event),
        requestId: c.get("requestId"),
      },
      "resend_webhook:received"
    );

    return c.json({ ok: true }, 200);
  } catch (error) {
    logger.warn(
      {
        err: error,
        requestId: c.get("requestId"),
      },
      "resend_webhook:invalid_signature"
    );
    return c.json({ error: "Invalid Resend webhook signature" }, 400);
  }
};

const makeStripeWebhookHandler =
  (endpointKind: StripeWebhookEndpointKind) => (c: Context<AppEnv>) =>
    createStripeWebhookHandler(endpointKind)(c);

export const webhookRoutes = new Hono<AppEnv>()
  .post("/stripe", makeStripeWebhookHandler("commerce"))
  .post("/stripe/billing", makeStripeWebhookHandler("billing"))
  .post("/stripe/commerce", makeStripeWebhookHandler("commerce"))
  .post("/stripe/connect", makeStripeWebhookHandler("connect"))
  .post("/resend", handleResendWebhook);
