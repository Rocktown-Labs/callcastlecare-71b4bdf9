/* eslint-disable complexity, eslint/no-await-in-loop, eslint/prefer-destructuring, eslint/require-await, eslint/require-unicode-regexp, oxc/branches-sharing-code, unicorn/prefer-ternary -- Legacy checkout/order finalization logic predates the current lint profile; keep this waiver narrow to this file until dispatch is redesigned. */
import { db, and, eq, sql } from "@callcastlecare/db";
import {
  addresses,
  checkoutItems,
  checkoutSessions,
  homePreorders,
  orders,
  orderStatusHistory,
  serviceLegs,
} from "@callcastlecare/db/schema/index";

import { dispatchOrder } from "./dispatch";
import { logger } from "./logger";
import { publishOutboxEvent } from "./outbox";

const LAUNDRY_LEG_SEQUENCE = [
  "pickup",
  "facility_in",
  "wash",
  "dry",
  "fold",
  "facility_out",
  "dropoff",
] as const;

const normalizeAddressComponent = (value: string) =>
  value.trim().replaceAll(/\s+/g, " ").toLowerCase();

const buildFormattedAddress = (input: {
  city: string;
  country: string;
  state: string;
  street: string;
  zip: string;
}) =>
  `${input.street}, ${input.city}, ${input.state} ${input.zip}, ${input.country}`;

export const createAddressRecord = async (input: {
  city: string;
  country: string;
  customerId: number;
  formattedAddress?: string;
  instructions?: string | null;
  isDefault?: boolean;
  label?: string;
  latitude: number | null;
  longitude: number | null;
  radarGeocodeJson: Record<string, unknown>;
  state: string;
  street: string;
  zip: string;
}) =>
  db.transaction(async (tx) => {
    const existingAddresses = await tx.query.addresses.findMany({
      where: eq(addresses.customerId, input.customerId),
    });

    const match = existingAddresses.find(
      (candidate) =>
        normalizeAddressComponent(candidate.street) ===
          normalizeAddressComponent(input.street) &&
        normalizeAddressComponent(candidate.city) ===
          normalizeAddressComponent(input.city) &&
        normalizeAddressComponent(candidate.state) ===
          normalizeAddressComponent(input.state) &&
        normalizeAddressComponent(candidate.zip) ===
          normalizeAddressComponent(input.zip) &&
        normalizeAddressComponent(candidate.country) ===
          normalizeAddressComponent(input.country)
    );

    if (input.isDefault) {
      await tx
        .update(addresses)
        .set({
          isDefault: false,
          updatedAt: new Date(),
        })
        .where(eq(addresses.customerId, input.customerId));
    }

    const locationSql =
      input.latitude !== null && input.longitude !== null
        ? sql`ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography`
        : null;

    const sharedPatch = {
      city: input.city,
      country: input.country,
      customerId: input.customerId,
      formattedAddress:
        input.formattedAddress ??
        buildFormattedAddress({
          city: input.city,
          country: input.country,
          state: input.state,
          street: input.street,
          zip: input.zip,
        }),
      instructions: input.instructions ?? null,
      isDefault: input.isDefault ?? false,
      isValidated: input.latitude !== null && input.longitude !== null,
      label: input.label ?? "Address",
      latitude: input.latitude,
      longitude: input.longitude,
      radarGeocodeJson: input.radarGeocodeJson,
      state: input.state,
      street: input.street,
      updatedAt: new Date(),
      zip: input.zip,
    } as const;

    if (match) {
      const updated = await tx
        .update(addresses)
        .set({
          ...sharedPatch,
          isDefault: input.isDefault ?? match.isDefault,
        })
        .where(eq(addresses.id, match.id))
        .returning();

      const address = updated[0];
      if (!address) {
        throw new Error("Failed to update existing address record");
      }

      if (locationSql) {
        await tx.execute(
          sql`UPDATE "addresses" SET "location" = ${locationSql}, "updated_at" = now() WHERE "id" = ${address.id}`
        );
      } else {
        await tx.execute(
          sql`UPDATE "addresses" SET "location" = NULL, "updated_at" = now() WHERE "id" = ${address.id}`
        );
      }

      return address;
    }

    const inserted = await tx
      .insert(addresses)
      .values({
        ...sharedPatch,
      })
      .returning();

    const address = inserted[0];
    if (!address) {
      throw new Error("Failed to create address record");
    }

    if (locationSql) {
      await tx.execute(
        sql`UPDATE "addresses" SET "location" = ${locationSql}, "updated_at" = now() WHERE "id" = ${address.id}`
      );
    }

    return address;
  });

export const createLaundryLegsIfMissing = async (orderId: number) => {
  const existingLegs = await db.query.serviceLegs.findMany({
    where: eq(serviceLegs.orderId, orderId),
  });

  if (existingLegs.length > 0) {
    return;
  }

  await db.insert(serviceLegs).values(
    LAUNDRY_LEG_SEQUENCE.map((legType, index) => ({
      legType,
      orderId,
      sequence: index + 1,
      status: "pending" as const,
    }))
  );
};

export const setOrderStatus = async (input: {
  note?: string;
  orderId: number;
  toStatus:
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
  triggeredByUserId?: string;
}) => {
  const current = await db.query.orders.findFirst({
    where: eq(orders.id, input.orderId),
  });

  if (!current) {
    throw new Error("Order not found");
  }

  await db
    .update(orders)
    .set({
      status: input.toStatus,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, input.orderId));

  await db.insert(orderStatusHistory).values({
    fromStatus: current.status,
    note: input.note,
    orderId: current.id,
    toStatus: input.toStatus,
    triggeredByUserId: input.triggeredByUserId,
  });
};

export const finalizeCheckoutPayment = async (input: {
  checkoutSessionId: number;
  stripePaymentIntentId?: string;
}) => {
  const existingSession = await db.query.checkoutSessions.findFirst({
    where: eq(checkoutSessions.id, input.checkoutSessionId),
  });

  if (!existingSession) {
    return {
      checkoutSession: null,
      createdOrderIds: [] as number[],
    };
  }

  if (existingSession.status === "paid") {
    const existingOrders = await db.query.orders.findMany({
      columns: {
        id: true,
      },
      where: eq(orders.checkoutSessionId, existingSession.id),
    });

    return {
      checkoutSession: existingSession,
      createdOrderIds: existingOrders.map((order) => order.id),
    };
  }

  const { createdOrderIds, hasPaidHomePreorder } = await db.transaction(
    async (tx) => {
      await tx
        .update(checkoutSessions)
        .set({
          paidAt: new Date(),
          status: "paid",
          stripePaymentIntentId:
            input.stripePaymentIntentId ??
            existingSession.stripePaymentIntentId,
          updatedAt: new Date(),
        })
        .where(eq(checkoutSessions.id, existingSession.id));

      const items = await tx.query.checkoutItems.findMany({
        where: eq(checkoutItems.checkoutSessionId, existingSession.id),
      });

      const existingOrders = await tx.query.orders.findMany({
        columns: {
          id: true,
        },
        where: eq(orders.checkoutSessionId, existingSession.id),
      });

      const hasOrdersForSession = existingOrders.length > 0;

      const orderIds: number[] = hasOrdersForSession
        ? existingOrders.map((entry) => entry.id)
        : [];
      let paidHomePreorder = false;

      if (!hasOrdersForSession) {
        for (const item of items) {
          const metadata = (item.metadataJson ?? {}) as Record<string, unknown>;
          const serviceTypeValue = metadata.serviceType;

          if (
            serviceTypeValue === "lawncare" ||
            serviceTypeValue === "laundry" ||
            serviceTypeValue === "window_washing"
          ) {
            const createdOrders = await tx
              .insert(orders)
              .values({
                addressId: existingSession.addressId,
                basePriceCents: item.basePriceCents,
                checkoutSessionId: existingSession.id,
                customerId: existingSession.customerId,
                pricingTier:
                  metadata.pricingTier === "small" ||
                  metadata.pricingTier === "medium" ||
                  metadata.pricingTier === "large"
                    ? metadata.pricingTier
                    : null,
                scheduledEndAt: item.scheduledEndAt,
                scheduledStartAt: item.scheduledStartAt,
                serviceType: serviceTypeValue,
                status: "paid",
                stripePaymentIntentId:
                  input.stripePaymentIntentId ??
                  existingSession.stripePaymentIntentId,
                timingType: item.timingType ?? "asap",
                tipAmountCents: item.tipAmountCents,
                totalPriceCents: item.totalPriceCents,
              })
              .returning({
                id: orders.id,
                serviceType: orders.serviceType,
              });

            const createdOrder = createdOrders[0];
            if (!createdOrder) {
              continue;
            }

            orderIds.push(createdOrder.id);

            if (createdOrder.serviceType === "laundry") {
              await tx.insert(serviceLegs).values(
                LAUNDRY_LEG_SEQUENCE.map((legType, index) => ({
                  legType,
                  orderId: createdOrder.id,
                  sequence: index + 1,
                  status: "pending" as const,
                }))
              );
            }
          }

          if (item.itemKind === "home_preorder") {
            const metadataHomeQuoteId =
              typeof metadata.homeQuoteId === "number"
                ? metadata.homeQuoteId
                : null;

            if (metadataHomeQuoteId === null) {
              continue;
            }

            const existingHomePreorder = await tx.query.homePreorders.findFirst(
              {
                where: and(
                  eq(homePreorders.checkoutSessionId, existingSession.id),
                  eq(homePreorders.homeQuoteId, metadataHomeQuoteId)
                ),
              }
            );

            if (existingHomePreorder) {
              await tx
                .update(homePreorders)
                .set({
                  paidAt: new Date(),
                  status: "paid",
                  stripePaymentIntentId:
                    input.stripePaymentIntentId ??
                    existingSession.stripePaymentIntentId,
                  updatedAt: new Date(),
                })
                .where(eq(homePreorders.id, existingHomePreorder.id));
              paidHomePreorder = true;
            } else {
              await tx.insert(homePreorders).values({
                addressId: existingSession.addressId,
                checkoutSessionId: existingSession.id,
                customerId: existingSession.customerId,
                depositAmountCents: item.basePriceCents,
                homeQuoteId: metadataHomeQuoteId,
                paidAt: new Date(),
                status: "paid",
                stripePaymentIntentId:
                  input.stripePaymentIntentId ??
                  existingSession.stripePaymentIntentId,
              });
              paidHomePreorder = true;
            }
          }
        }
      }

      return {
        createdOrderIds: orderIds,
        hasPaidHomePreorder: paidHomePreorder,
      };
    }
  );

  await publishOutboxEvent({
    eventName: "checkout_confirmed",
    payload: {
      checkoutSessionId: existingSession.id,
      customerId: existingSession.customerId,
    },
  });

  if (hasPaidHomePreorder) {
    await publishOutboxEvent({
      eventName: "home_preorder_confirmed",
      payload: {
        checkoutSessionId: existingSession.id,
        customerId: existingSession.customerId,
      },
    });
  }

  for (const orderId of createdOrderIds) {
    await dispatchOrder({
      orderId,
      sequence: 1,
    });
  }

  logger.info(
    {
      checkoutSessionId: existingSession.id,
      createdOrderIds,
    },
    "checkout:paid:finalized"
  );

  return {
    checkoutSession: {
      ...existingSession,
      status: "paid",
    },
    createdOrderIds,
  };
};
