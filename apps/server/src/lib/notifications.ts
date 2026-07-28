/* eslint-disable max-statements, sort-keys */
import { and, db, eq, inArray } from "@callcastlecare/db";
import {
  customers,
  notifications,
  orders,
  outboxEvents,
} from "@callcastlecare/db/schema/index";

import { sendEmail } from "./integrations/email";
import { logger } from "./logger";

const EVENT_MESSAGES: Record<string, { body: string; subject: string }> = {
  checkout_confirmed: {
    body: "Your checkout is confirmed and your services are being prepared.",
    subject: "Checkout confirmed",
  },
  dispatch_delayed_or_unassigned: {
    body: "We are still searching for a provider. We will keep you updated.",
    subject: "Dispatch delayed",
  },
  driver_arrived: {
    body: "Your provider has arrived.",
    subject: "Provider arrived",
  },
  driver_assigned: {
    body: "A provider is assigned to your order.",
    subject: "Provider assigned",
  },
  home_preorder_confirmed: {
    body: "Your home project deposit has been recorded.",
    subject: "Home preorder confirmed",
  },
  home_quote_ready: {
    body: "Your home project quote is ready.",
    subject: "Home quote ready",
  },
  order_cancelled: {
    body: "Your order has been cancelled.",
    subject: "Order cancelled",
  },
  order_auto_rescheduled: {
    body: "We could not secure a provider immediately and auto-rescheduled your order.",
    subject: "Order auto-rescheduled",
  },
  order_dispatched: {
    body: "Your order is currently being offered to nearby providers.",
    subject: "Order dispatched",
  },
  service_completed: {
    body: "Your service is complete. Thanks for using CastleCare.",
    subject: "Service completed",
  },
  service_started: {
    body: "Your service has started.",
    subject: "Service started",
  },
};

const getCustomerFromPayload = async (
  payload: Record<string, unknown>
): Promise<{ customerId: number; email: string } | null> => {
  const payloadCustomerId =
    typeof payload.customerId === "number" ? payload.customerId : null;

  if (payloadCustomerId !== null) {
    const customer = await db.query.customers.findFirst({
      columns: {
        email: true,
        id: true,
      },
      where: eq(customers.id, payloadCustomerId),
    });

    if (customer) {
      return {
        customerId: customer.id,
        email: customer.email,
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
  };
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
    const message = EVENT_MESSAGES[event.eventName] ?? {
      body: event.eventName,
      subject: "CastleCare update",
    };

    const customer = await getCustomerFromPayload(payload);

    if (customer) {
      await db.insert(notifications).values({
        body: message.body,
        channel: "in_app",
        customerId: customer.customerId,
        orderId: typeof payload.orderId === "number" ? payload.orderId : null,
        status: "sent",
        subject: message.subject,
      });

      await db.insert(notifications).values({
        body: message.body,
        channel: "email",
        customerId: customer.customerId,
        orderId: typeof payload.orderId === "number" ? payload.orderId : null,
        status: "sending",
        subject: message.subject,
      });

      await sendEmail({
        html: `<p>${message.body}</p>`,
        subject: message.subject,
        text: message.body,
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
