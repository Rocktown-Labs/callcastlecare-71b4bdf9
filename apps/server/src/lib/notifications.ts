import { and, db, eq, inArray } from "@callcastlecare/db";
import {
  customers,
  notifications,
  orders,
  outboxEvents,
} from "@callcastlecare/db/schema/index";
/* eslint-disable max-statements, sort-keys */
import {
  castleCareUrl,
  getEventEmailDefinition,
  getServiceStatusEmailProps,
  renderActionEmail,
  renderServiceStatusUpdateEmail,
  renderWelcomeEmail,
} from "@callcastlecare/email";
import { env } from "@callcastlecare/env/server";

import { sendEmail } from "./integrations/email";
import { logger } from "./logger";

const getCustomerFromPayload = async (
  payload: Record<string, unknown>
): Promise<{ customerId: number; email: string; name: string } | null> => {
  const payloadCustomerId =
    typeof payload.customerId === "number" ? payload.customerId : null;

  if (payloadCustomerId !== null) {
    const customer = await db.query.customers.findFirst({
      columns: {
        email: true,
        firstName: true,
        id: true,
      },
      where: eq(customers.id, payloadCustomerId),
    });

    if (customer) {
      return {
        customerId: customer.id,
        email: customer.email,
        name: customer.firstName,
      };
    }
  }

  const payloadOrderId =
    typeof payload.orderId === "number" ? payload.orderId : null;
  if (payloadOrderId === null) {
    return null;
  }

  const order = await db.query.orders.findFirst({
    columns: {
      customerId: true,
      id: true,
    },
    where: eq(orders.id, payloadOrderId),
  });

  if (!order) {
    return null;
  }

  const customer = await db.query.customers.findFirst({
    columns: {
      email: true,
      firstName: true,
      id: true,
    },
    where: eq(customers.id, order.customerId),
  });

  if (!customer) {
    return null;
  }

  return {
    customerId: customer.id,
    email: customer.email,
    name: customer.firstName,
  };
};

const getPayloadOrderId = (payload: Record<string, unknown>) =>
  typeof payload.orderId === "number" ? payload.orderId : undefined;

/**
 * Post-first-payment welcome flow. Published once per customer from
 * finalizeCheckoutPayment with a stable eventKey, delivered over the
 * outbox/Vercel-queue pipeline, and sent with Resend idempotency keys so
 * webhook retries can never double-send.
 */
const sendCustomerWelcomeEmails = async (payload: Record<string, unknown>) => {
  const customer = await getCustomerFromPayload(payload);
  if (!customer) {
    logger.warn({ eventName: "customer_welcome" }, "welcome:customer_missing");
    return;
  }

  const orderId = getPayloadOrderId(payload);
  const welcome = await renderWelcomeEmail({
    customerName: customer.name,
    dashboardUrl: castleCareUrl("/dashboard"),
  });
  await sendEmail({
    html: welcome.html,
    idempotencyKey: `customer-welcome/${customer.customerId}`,
    subject: "Welcome to CastleCare",
    text: welcome.text,
    to: customer.email,
  });

  const adminEmail = env.ADMIN_EMAIL;
  if (adminEmail) {
    const alert = await renderActionEmail({
      body: `A new customer account completed its first booking${orderId ? ` (Order #${orderId})` : ""}: ${customer.name} (${customer.email}).`,
      buttonLabel: "Open Admin Dashboard",
      preview: `New customer signup: ${customer.name}`,
      title: "New Customer Signup",
      url: castleCareUrl("/admin"),
    });
    await sendEmail({
      html: alert.html,
      idempotencyKey: `admin-signup/${customer.customerId}`,
      subject: `New Customer Signup: ${customer.name}`,
      text: alert.text,
      to: adminEmail,
    });
  }

  logger.info(
    { customerId: customer.customerId, orderId: orderId ?? null },
    "welcome:sent"
  );
};

export const processOutboxEvent = async (outboxEventId: number) => {
  const event = await db.query.outboxEvents.findFirst({
    where: and(
      eq(outboxEvents.id, outboxEventId),
      inArray(outboxEvents.status, ["pending", "processing", "failed"])
    ),
  });

  if (!event) {
    return;
  }

  if (event.status === "sent") {
    return;
  }

  await db
    .update(outboxEvents)
    .set({
      status: "processing",
    })
    .where(eq(outboxEvents.id, event.id));

  try {
    const payload = (event.payloadJson ?? {}) as Record<string, unknown>;

    if (event.eventName === "customer_welcome") {
      await sendCustomerWelcomeEmails(payload);
      await db
        .update(outboxEvents)
        .set({
          processedAt: new Date(),
          status: "sent",
        })
        .where(eq(outboxEvents.id, event.id));
      return;
    }

    const message = getEventEmailDefinition(event.eventName);

    const customer = await getCustomerFromPayload(payload);

    if (customer) {
      const orderId = getPayloadOrderId(payload);
      await db.insert(notifications).values({
        body: message.body,
        channel: "in_app",
        customerId: customer.customerId,
        orderId: orderId ?? null,
        status: "sent",
        subject: message.subject,
      });

      await db.insert(notifications).values({
        body: message.body,
        channel: "email",
        customerId: customer.customerId,
        orderId: orderId ?? null,
        status: "sending",
        subject: message.subject,
      });

      const renderedEmail = await renderServiceStatusUpdateEmail(
        getServiceStatusEmailProps({
          body: message.body,
          customerName: customer.name,
          orderId,
          statusLabel: message.statusLabel,
        })
      );

      await sendEmail({
        html: renderedEmail.html,
        idempotencyKey: `outbox-event/${event.id}/customer-email`,
        subject: message.subject,
        text: renderedEmail.text,
        to: customer.email,
      });
    }

    await db
      .update(outboxEvents)
      .set({
        processedAt: new Date(),
        status: "sent",
      })
      .where(eq(outboxEvents.id, event.id));
  } catch (error) {
    await db
      .update(outboxEvents)
      .set({
        status: "failed",
      })
      .where(eq(outboxEvents.id, event.id));

    logger.error(
      {
        error,
        outboxEventId,
      },
      "outbox:processing_failed"
    );
  }
};
