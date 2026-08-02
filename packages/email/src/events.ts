import type { ServiceStatusUpdateEmailProps } from "./templates/service-status-update";
import { castleCareUrl } from "./theme";

interface EventEmailDefinition {
  body: string;
  statusLabel: string;
  subject: string;
}

export const eventEmailDefinitions: Record<string, EventEmailDefinition> = {
  checkout_confirmed: {
    body: "Your checkout is confirmed and your services are being prepared.",
    statusLabel: "Checkout confirmed",
    subject: "Checkout confirmed",
  },
  dispatch_delayed_or_unassigned: {
    body: "We are still searching for a provider. We will keep you updated.",
    statusLabel: "Dispatch delayed",
    subject: "Dispatch delayed",
  },
  driver_arrived: {
    body: "Your provider has arrived.",
    statusLabel: "Provider arrived",
    subject: "Provider arrived",
  },
  driver_assigned: {
    body: "A provider is assigned to your order.",
    statusLabel: "Provider assigned",
    subject: "Provider assigned",
  },
  order_auto_rescheduled: {
    body: "We could not secure a provider immediately and auto-rescheduled your order.",
    statusLabel: "Order auto-rescheduled",
    subject: "Order auto-rescheduled",
  },
  order_cancelled: {
    body: "Your order has been cancelled.",
    statusLabel: "Order cancelled",
    subject: "Order cancelled",
  },
  order_dispatched: {
    body: "Your order is currently being offered to nearby providers.",
    statusLabel: "Order dispatched",
    subject: "Order dispatched",
  },
  service_completed: {
    body: "Your service is complete. Thanks for using CastleCare.",
    statusLabel: "Service completed",
    subject: "Service completed",
  },
  service_started: {
    body: "Your service has started.",
    statusLabel: "Service started",
    subject: "Service started",
  },
} satisfies Record<string, EventEmailDefinition>;

export const getEventEmailDefinition = (eventName: string) =>
  eventEmailDefinitions[eventName] ?? {
    body: "There is a new update on your CastleCare service.",
    statusLabel: "CastleCare update",
    subject: "CastleCare update",
  };

export const getServiceStatusEmailProps = (input: {
  body: string;
  customerName?: string;
  orderId?: number;
  statusLabel: string;
  statusUrl?: string;
}): ServiceStatusUpdateEmailProps => ({
  body: input.body,
  ...(input.customerName ? { customerName: input.customerName } : {}),
  ...(input.orderId ? { orderLabel: `Order #${input.orderId}` } : {}),
  statusLabel: input.statusLabel,
  statusUrl:
    input.statusUrl ??
    (input.orderId
      ? castleCareUrl(`/dashboard/orders/${input.orderId}`)
      : undefined),
});
