import { db, eq } from "@callcastlecare/db";
import {
  user as authUsers,
  checkoutItems,
  checkoutSessions,
  customers,
  orders,
  serviceLegs,
  serviceSubscriptions,
} from "@callcastlecare/db/schema/index";

import { logger } from "./logger";

const LAUNDRY_LEG_SEQUENCE = [
  "pickup",
  "facility_in",
  "wash",
  "dry",
  "fold",
  "facility_out",
  "dropoff",
] as const;

const SERVICE_TYPES = ["lawncare", "laundry", "window_washing"] as const;
type ServiceType = (typeof SERVICE_TYPES)[number];

interface ServiceUnit {
  serviceType: ServiceType;
  spacingDays: number;
  units: number;
}

const isServiceType = (value: unknown): value is ServiceType =>
  typeof value === "string" && SERVICE_TYPES.includes(value as ServiceType);

const getEpochDate = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Date(value * 1000)
    : null;

const getString = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null;

const getStripeMetadata = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const getPlanCode = (metadata: Record<string, unknown>) => {
  const directPlanCode = getString(metadata.planCode);
  if (directPlanCode) {
    return directPlanCode;
  }

  const planIds = getString(metadata.planIds);
  return planIds?.split(",")[0] ?? null;
};

const getStripePriceId = (stripeSubscription: Record<string, unknown>) => {
  const items = getStripeMetadata(stripeSubscription.items);
  const data = Array.isArray(items.data) ? items.data : [];
  const [firstItem] = data;
  if (!firstItem || typeof firstItem !== "object") {
    return null;
  }
  const price = getStripeMetadata(firstItem.price);
  return getString(price.id) ?? getString(firstItem.price);
};

const getServiceUnits = (metadata: Record<string, unknown>): ServiceUnit[] => {
  if (Array.isArray(metadata.serviceUnits)) {
    return metadata.serviceUnits.flatMap((value) => {
      if (!value || typeof value !== "object") {
        return [];
      }
      const unit = value as Record<string, unknown>;
      const serviceType = isServiceType(unit.serviceType)
        ? unit.serviceType
        : null;
      const units =
        typeof unit.units === "number" &&
        Number.isInteger(unit.units) &&
        unit.units > 0 &&
        unit.units <= 12
          ? unit.units
          : 0;
      const spacingDays =
        typeof unit.spacingDays === "number" &&
        Number.isInteger(unit.spacingDays) &&
        unit.spacingDays >= 0
          ? unit.spacingDays
          : 0;
      return serviceType && units > 0
        ? [{ serviceType, spacingDays, units }]
        : [];
    });
  }

  const serviceType = isServiceType(metadata.serviceType)
    ? metadata.serviceType
    : null;
  return serviceType ? [{ serviceType, spacingDays: 0, units: 1 }] : [];
};

const getCheckoutServiceItemMetadata = async (checkoutSessionId: number) => {
  const items = await db.query.checkoutItems.findMany({
    where: eq(checkoutItems.checkoutSessionId, checkoutSessionId),
  });
  return items.filter((item) => {
    const metadata = getStripeMetadata(item.metadataJson);
    return getServiceUnits(metadata).length > 0;
  });
};

const getLocalCustomer = async (stripeCustomerId: string) => {
  const user = await db.query.user.findFirst({
    columns: { id: true },
    where: eq(authUsers.stripeCustomerId, stripeCustomerId),
  });
  if (!user) {
    return null;
  }

  return db.query.customers.findFirst({
    where: eq(customers.userId, user.id),
  });
};

const getPeriodDates = (stripeSubscription: Record<string, unknown>) => ({
  cancelAt: getEpochDate(stripeSubscription.cancel_at),
  canceledAt: getEpochDate(stripeSubscription.canceled_at),
  currentPeriodEnd: getEpochDate(stripeSubscription.current_period_end),
  currentPeriodStart: getEpochDate(stripeSubscription.current_period_start),
  endedAt: getEpochDate(stripeSubscription.ended_at),
});

const getCustomerForSubscriptionContext = (input: {
  checkoutSession: typeof checkoutSessions.$inferSelect | null;
  existing: typeof serviceSubscriptions.$inferSelect | undefined;
  stripeCustomerId: string;
}) => {
  if (input.existing) {
    return null;
  }
  if (!input.checkoutSession) {
    return getLocalCustomer(input.stripeCustomerId);
  }
  return db.query.customers.findFirst({
    where: eq(customers.id, input.checkoutSession.customerId),
  });
};

const getSubscriptionLocalContext = async (input: {
  checkoutSessionId?: number;
  existing: typeof serviceSubscriptions.$inferSelect | undefined;
  metadata: Record<string, unknown>;
  stripeCustomerId: string;
  stripePriceId: string | null;
}) => {
  let checkoutSession: typeof checkoutSessions.$inferSelect | null = null;
  if (input.checkoutSessionId) {
    checkoutSession =
      (await db.query.checkoutSessions.findFirst({
        where: eq(checkoutSessions.id, input.checkoutSessionId),
      })) ?? null;
  }

  const localCustomer = await getCustomerForSubscriptionContext({
    checkoutSession,
    existing: input.existing,
    stripeCustomerId: input.stripeCustomerId,
  });

  return {
    addressId: input.existing?.addressId ?? checkoutSession?.addressId,
    checkoutSessionId:
      input.existing?.checkoutSessionId ?? input.checkoutSessionId,
    customerId: input.existing?.customerId ?? localCustomer?.id,
    planCode: input.existing?.planCode ?? getPlanCode(input.metadata),
    stripePriceId: input.existing?.stripePriceId ?? input.stripePriceId,
  };
};

export const upsertServiceSubscription = async (input: {
  checkoutSessionId?: number;
  stripeSubscription: Record<string, unknown>;
}) => {
  const stripeSubscriptionId = getString(input.stripeSubscription.id);
  const stripeCustomerId = getString(input.stripeSubscription.customer);
  if (!(stripeSubscriptionId && stripeCustomerId)) {
    logger.warn(
      { stripeCustomerId, stripeSubscriptionId },
      "stripe_subscription:missing_identity"
    );
    return null;
  }

  const metadata = getStripeMetadata(input.stripeSubscription.metadata);
  const existing = await db.query.serviceSubscriptions.findFirst({
    where: eq(serviceSubscriptions.stripeSubscriptionId, stripeSubscriptionId),
  });
  const context = await getSubscriptionLocalContext({
    checkoutSessionId: input.checkoutSessionId,
    existing,
    metadata,
    stripeCustomerId,
    stripePriceId: getStripePriceId(input.stripeSubscription),
  });
  if (
    !(
      context.customerId &&
      context.addressId &&
      context.checkoutSessionId &&
      context.planCode &&
      context.stripePriceId
    )
  ) {
    logger.warn(
      {
        addressId: context.addressId,
        customerId: context.customerId,
        planCode: context.planCode,
        stripePriceId: context.stripePriceId,
        stripeSubscriptionId,
      },
      "stripe_subscription:local_mapping_missing"
    );
    return null;
  }

  const dates = getPeriodDates(input.stripeSubscription);
  const billingInterval =
    existing?.billingInterval ?? getString(metadata.billingInterval) ?? "month";
  const status = getString(input.stripeSubscription.status) ?? "incomplete";
  const values = {
    addressId: context.addressId,
    billingInterval,
    cancelAt: dates.cancelAt,
    cancelAtPeriodEnd: input.stripeSubscription.cancel_at_period_end === true,
    canceledAt: dates.canceledAt,
    checkoutSessionId: context.checkoutSessionId,
    currentPeriodEnd: dates.currentPeriodEnd,
    currentPeriodStart: dates.currentPeriodStart,
    customerId: context.customerId,
    endedAt: dates.endedAt,
    metadataJson: metadata,
    planCode: context.planCode,
    status,
    stripeCustomerId,
    stripePriceId: context.stripePriceId,
    stripeSubscriptionId,
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db
      .update(serviceSubscriptions)
      .set(values)
      .where(eq(serviceSubscriptions.id, existing.id))
      .returning();
    return updated ?? existing;
  }

  const [created] = await db
    .insert(serviceSubscriptions)
    .values(values)
    .returning();
  return created ?? null;
};

const allocateCents = (totalCents: number, index: number, count: number) => {
  const baseCents = Math.floor(totalCents / count);
  return index === count - 1 ? totalCents - baseCents * (count - 1) : baseCents;
};

const getSubscriptionServiceDate = (input: {
  originalStart: Date | null;
  periodStart: Date;
  occurrence: number;
  spacingDays: number;
}) => {
  const result = new Date(input.periodStart);
  if (input.originalStart) {
    result.setUTCHours(
      input.originalStart.getUTCHours(),
      input.originalStart.getUTCMinutes(),
      input.originalStart.getUTCSeconds(),
      input.originalStart.getUTCMilliseconds()
    );
  }
  result.setTime(
    result.getTime() +
      input.occurrence * input.spacingDays * 24 * 60 * 60 * 1000
  );
  return result;
};

export const getServiceSubscriptionByStripeId = (
  stripeSubscriptionId: string
) =>
  db.query.serviceSubscriptions.findFirst({
    where: eq(serviceSubscriptions.stripeSubscriptionId, stripeSubscriptionId),
  });

export const updateServiceSubscriptionStatus = async (input: {
  canceledAt?: Date | null;
  currentPeriodEnd?: Date | null;
  currentPeriodStart?: Date | null;
  status: string;
  stripeSubscriptionId: string;
}) => {
  const [updated] = await db
    .update(serviceSubscriptions)
    .set({
      canceledAt: input.canceledAt,
      currentPeriodEnd: input.currentPeriodEnd,
      currentPeriodStart: input.currentPeriodStart,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      eq(serviceSubscriptions.stripeSubscriptionId, input.stripeSubscriptionId)
    )
    .returning();
  return updated ?? null;
};

const materializeSourceItemOrders = async (input: {
  periodStart: Date;
  serviceSubscription: typeof serviceSubscriptions.$inferSelect;
  sourceItem: typeof checkoutItems.$inferSelect;
}) => {
  const metadata = getStripeMetadata(input.sourceItem.metadataJson);
  const units = getServiceUnits(metadata);
  const totalUnits = units.reduce((sum, unit) => sum + unit.units, 0);
  const originalStart = input.sourceItem.scheduledStartAt;
  const occurrenceByService = new Map<ServiceType, number>();
  const components = units.flatMap((unit) => {
    const componentsForUnit = Array.from({ length: unit.units }, () => {
      const occurrence = occurrenceByService.get(unit.serviceType) ?? 0;
      occurrenceByService.set(unit.serviceType, occurrence + 1);
      return {
        occurrence,
        serviceType: unit.serviceType,
        spacingDays: unit.spacingDays,
      };
    });
    return componentsForUnit;
  });

  const orderIds = await Promise.all(
    components.map(async (component, unitIndex) => {
      const scheduledStartAt = getSubscriptionServiceDate({
        occurrence: component.occurrence,
        originalStart,
        periodStart: input.periodStart,
        spacingDays: component.spacingDays,
      });
      const scheduledEndAt = new Date(
        scheduledStartAt.getTime() + 2 * 60 * 60 * 1000
      );
      const [created] = await db
        .insert(orders)
        .values({
          addressId: input.serviceSubscription.addressId,
          basePriceCents: allocateCents(
            input.sourceItem.basePriceCents,
            unitIndex,
            totalUnits
          ),
          checkoutSessionId: input.serviceSubscription.checkoutSessionId,
          customerId: input.serviceSubscription.customerId,
          scheduledEndAt,
          scheduledStartAt,
          serviceSubscriptionId: input.serviceSubscription.id,
          serviceType: component.serviceType,
          status: "paid",
          stripePaymentIntentId: null,
          subscriptionPeriodStart: input.periodStart,
          subscriptionUnitIndex: unitIndex,
          timingType: "scheduled",
          tipAmountCents: 0,
          totalPriceCents: allocateCents(
            input.sourceItem.totalPriceCents,
            unitIndex,
            totalUnits
          ),
        })
        .onConflictDoNothing()
        .returning({ id: orders.id });
      if (!created) {
        return null;
      }

      if (component.serviceType === "laundry") {
        await db.insert(serviceLegs).values(
          LAUNDRY_LEG_SEQUENCE.map((legType, legIndex) => ({
            legType,
            orderId: created.id,
            sequence: legIndex + 1,
            status: "pending" as const,
          }))
        );
      }
      return created.id;
    })
  );

  return orderIds.filter((orderId): orderId is number => orderId !== null);
};

export const materializeSubscriptionPeriodOrders = async (input: {
  periodEnd?: Date | null;
  periodStart?: Date | null;
  serviceSubscriptionId: number;
}) => {
  const subscription = await db.query.serviceSubscriptions.findFirst({
    where: eq(serviceSubscriptions.id, input.serviceSubscriptionId),
  });
  if (!subscription) {
    return [] as number[];
  }

  const sourceItems = await getCheckoutServiceItemMetadata(
    subscription.checkoutSessionId
  );
  const periodStart =
    input.periodStart ?? subscription.currentPeriodStart ?? new Date();
  const periodEnd = input.periodEnd ?? subscription.currentPeriodEnd ?? null;
  const createdOrderGroups = await Promise.all(
    sourceItems.map((sourceItem) =>
      materializeSourceItemOrders({
        periodStart,
        serviceSubscription: subscription,
        sourceItem,
      })
    )
  );
  const createdOrderIds = createdOrderGroups.flat();

  logger.info(
    {
      createdOrderIds,
      periodEnd,
      periodStart,
      serviceSubscriptionId: subscription.id,
    },
    "stripe_subscription:period_orders_materialized"
  );
  return createdOrderIds;
};
