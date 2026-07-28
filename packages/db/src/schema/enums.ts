import { pgEnum } from "drizzle-orm/pg-core";

export const serviceTypeEnum = pgEnum("service_type", [
  "lawncare",
  "laundry",
  "window_washing",
]);

export const windowWashingPackageEnum = pgEnum("window_washing_package", [
  "EXTERIOR_ONLY",
  "FULL_SERVICE",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "quoted",
  "pending_payment",
  "paid",
  "dispatching",
  "assigned",
  "en_route",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
  "failed",
]);

export const timingTypeEnum = pgEnum("timing_type", ["asap", "scheduled"]);

export const pricingTierEnum = pgEnum("pricing_tier", [
  "small",
  "medium",
  "large",
]);

export const workerStatusEnum = pgEnum("worker_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const quoteStatusEnum = pgEnum("quote_status", [
  "pending",
  "ready",
  "expired",
  "accepted",
  "rejected",
]);

export const dispatchOfferStatusEnum = pgEnum("dispatch_offer_status", [
  "pending",
  "accepted",
  "declined",
  "expired",
  "cancelled",
]);

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "active",
  "completed",
  "cancelled",
]);

export const legTypeEnum = pgEnum("leg_type", [
  "pickup",
  "facility_in",
  "wash",
  "dry",
  "fold",
  "facility_out",
  "dropoff",
]);

export const legStatusEnum = pgEnum("leg_status", [
  "pending",
  "en_route",
  "arrived",
  "started",
  "stopped",
  "completed",
  "cancelled",
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "lawncare_before",
  "lawncare_after",
  "laundry_pickup",
  "laundry_scan",
  "laundry_folded",
  "laundry_dropoff",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "push",
  "sms",
  "email",
  "in_app",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "queued",
  "sending",
  "sent",
  "delivered",
  "failed",
]);

export const earningTypeEnum = pgEnum("earning_type", [
  "base_pay",
  "tip",
  "adjustment",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
]);

export const outboxStatusEnum = pgEnum("outbox_status", [
  "pending",
  "processing",
  "sent",
  "failed",
  "dead_letter",
]);

export const checkoutSessionStatusEnum = pgEnum("checkout_session_status", [
  "draft",
  "pending_payment",
  "paid",
  "failed",
  "cancelled",
]);

export const quoteRequestStatusEnum = pgEnum("quote_request_status", [
  "draft",
  "contact_captured",
  "checkout_started",
  "paid",
  "abandoned",
  "cancelled",
]);

export const checkoutItemKindEnum = pgEnum("checkout_item_kind", [
  "lawncare",
  "laundry",
  "window_washing",
  "home_preorder",
]);

export const homeQuoteStatusEnum = pgEnum("home_quote_status", [
  "pending",
  "ready",
  "expired",
]);

export const homePreorderStatusEnum = pgEnum("home_preorder_status", [
  "pending_payment",
  "paid",
  "cancelled",
  "failed",
]);
