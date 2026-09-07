import { db, eq } from "@callcastlecare/db";
import { orders } from "@callcastlecare/db/schema/index";

export const ADMIN_OPEN_ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "dispatching",
  "assigned",
  "en_route",
  "arrived",
  "in_progress",
] as const;

export type AdminOrderStatus =
  | "draft"
  | "quoted"
  | "pending_payment"
  | "paid"
  | "dispatching"
  | "assigned"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "failed";

export const serviceLabels = {
  laundry: "Laundry",
  lawncare: "Lawn Care",
  window_washing: "Window Washing",
} as const;

export const statusLabels = {
  arrived: "Arrived",
  assigned: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  dispatching: "Ready to dispatch",
  draft: "Draft",
  en_route: "On the way",
  failed: "Failed",
  in_progress: "In progress",
  paid: "Paid",
  pending_payment: "Awaiting payment",
  quoted: "Quoted",
} as const satisfies Record<AdminOrderStatus, string>;

const sameDate = (first: Date | null, second: Date | null) =>
  first?.getTime() === second?.getTime();

export const getOrderGroupKey = (order: {
  checkoutSessionId: number | null;
  id: number;
  scheduledStartAt: Date | null;
}) =>
  `${order.checkoutSessionId ?? `order-${order.id}`}:${order.scheduledStartAt?.toISOString() ?? "unscheduled"}`;

export const getGroupStatus = (statuses: AdminOrderStatus[]) => {
  if (statuses.length === 0) {
    return "paid" as const;
  }

  if (statuses.every((status) => status === "completed")) {
    return "completed" as const;
  }

  const priority: AdminOrderStatus[] = [
    "in_progress",
    "arrived",
    "en_route",
    "assigned",
    "dispatching",
    "paid",
    "pending_payment",
    "failed",
    "cancelled",
    "quoted",
    "draft",
  ];

  return (
    priority.find((status) => statuses.includes(status)) ??
    statuses[0] ??
    "paid"
  );
};

export const getOrderGroupMembers = async (orderId: number) => {
  const anchor = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!anchor) {
    return null;
  }

  if (!anchor.checkoutSessionId) {
    return [anchor];
  }

  const relatedOrders = await db.query.orders.findMany({
    where: eq(orders.checkoutSessionId, anchor.checkoutSessionId),
  });

  const members = relatedOrders.filter((order) =>
    sameDate(order.scheduledStartAt, anchor.scheduledStartAt)
  );
  return [
    anchor,
    ...[...members.filter((order) => order.id !== anchor.id)]
      .toSorted((first, second) => first.id - second.id),
  ];
};

export const isAdminOpenOrder = (status: string) =>
  ADMIN_OPEN_ORDER_STATUSES.includes(
    status as (typeof ADMIN_OPEN_ORDER_STATUSES)[number]
  );
