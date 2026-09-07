/* eslint-disable complexity, eslint/no-await-in-loop, eslint/prefer-destructuring, eslint/require-await, eslint/require-unicode-regexp, oxc/branches-sharing-code, unicorn/prefer-ternary -- Legacy checkout/order finalization logic predates the current lint profile; keep this waiver narrow to this file until dispatch is redesigned. */
import {
  STANDARD_DEPOSIT_CENTS,
  getCheckoutDepositCents,
} from "@callcastlecare/api";
import { db, and, eq, sql } from "@callcastlecare/db";
import {
  addresses,
  checkoutItems,
  checkoutSessions,
  customers,
  homePreorders,
  orderItems,
  orders,
  orderStatusHistory,
  serviceLegs,
  serviceSubscriptions,
} from "@callcastlecare/db/schema/index";
import {
  castleCareUrl,
  renderAdminBookingAlertEmail,
  renderBookingReceivedEmail,
} from "@callcastlecare/email";
import { env } from "@callcastlecare/env/server";

import { dispatchOrder } from "./dispatch";
import { getComboServiceTypes } from "./domain/checkout";
import type { CheckoutServiceType } from "./domain/checkout";
import { sendEmail } from "./integrations/email";
import { logger } from "./logger";
import { publishOutboxEvent } from "./outbox";

const CHECKOUT_SLOT_LOCK_KEY = 7_318_204;

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

export const buildFormattedAddress = (input: {
  city: string;
  country: string;
  state: string;
  street: string;
  zip: string;
}) =>
  `${input.street}, ${input.city}, ${input.state} ${input.zip}, ${input.country}`;

const isCheckoutServiceType = (value: unknown): value is CheckoutServiceType =>
  value === "lawncare" || value === "laundry" || value === "window_washing";

interface ServiceOrderComponent {
  serviceType: CheckoutServiceType;
  spacingDays: number;
}

const getServiceOrderTypes = (
  metadata: Record<string, unknown>
): ServiceOrderComponent[] => {
  if (Array.isArray(metadata.serviceUnits)) {
    const components: ServiceOrderComponent[] = [];
    for (const unit of metadata.serviceUnits) {
      if (!unit || typeof unit !== "object") {
        continue;
      }
      const serviceUnit = unit as Record<string, unknown>;
      const serviceType = isCheckoutServiceType(serviceUnit.serviceType)
        ? serviceUnit.serviceType
        : null;
      const units =
        typeof serviceUnit.units === "number" &&
        Number.isInteger(serviceUnit.units) &&
        serviceUnit.units > 0 &&
        serviceUnit.units <= 12
          ? serviceUnit.units
          : 0;
      const spacingDays =
        typeof serviceUnit.spacingDays === "number" &&
        Number.isInteger(serviceUnit.spacingDays) &&
        serviceUnit.spacingDays >= 0
          ? serviceUnit.spacingDays
          : 0;
      if (!serviceType) {
        continue;
      }
      for (let index = 0; index < units; index += 1) {
        components.push({ serviceType, spacingDays });
      }
    }
    if (components.length > 0) {
      return components;
    }
  }

  if (isCheckoutServiceType(metadata.serviceType)) {
    return [{ serviceType: metadata.serviceType, spacingDays: 0 }];
  }

  if (metadata.serviceType !== "combo") {
    return [];
  }

  if (Array.isArray(metadata.comboServiceTypes)) {
    const serviceTypes = metadata.comboServiceTypes
      .filter(isCheckoutServiceType)
      .map((serviceType) => ({ serviceType, spacingDays: 0 }));
    if (serviceTypes.length > 0) {
      return serviceTypes;
    }
  }

  return typeof metadata.planId === "string"
    ? (getComboServiceTypes(metadata.planId) ?? []).map((serviceType) => ({
        serviceType,
        spacingDays: 0,
      }))
    : [];
};

const SERVICE_LABELS: Record<CheckoutServiceType, string> = {
  laundry: "Laundry",
  lawncare: "Lawn Care",
  window_washing: "Window Washing",
};

const getScheduledComponentDate = (
  value: Date | null,
  occurrence: number,
  spacingDays: number
) => {
  if (!value || spacingDays === 0 || occurrence === 0) {
    return value;
  }
  return new Date(
    value.getTime() + occurrence * spacingDays * 24 * 60 * 60 * 1000
  );
};

const allocateCents = (totalCents: number, index: number, count: number) => {
  const baseCents = Math.floor(totalCents / count);
  return index === count - 1 ? totalCents - baseCents * (count - 1) : baseCents;
};

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

export const formatAppointmentWindow = (
  start: Date | string | null,
  end: Date | string | null
) => {
  if (!start) {
    return "Appointment window pending";
  }
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;
  const dateStr = startDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "America/Chicago",
    weekday: "short",
  });
  const startTime = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });
  const endTime = endDate
    ? endDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Chicago",
      })
    : "";
  return endTime
    ? `${dateStr}, ${startTime} – ${endTime}`
    : `${dateStr}, ${startTime}`;
};

export const finalizeCheckoutPayment = async (input: {
  checkoutSessionId: number;
  stripePaymentIntentId?: string;
  stripeSubscriptionId?: string;
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

  const { createdOrderIds, dispatchOrderIds, hasPaidHomePreorder } =
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(${CHECKOUT_SLOT_LOCK_KEY})`
      );

      await tx
        .update(checkoutSessions)
        .set({
          paidAt: new Date(),
          status: "paid",
          stripePaymentIntentId:
            input.stripePaymentIntentId ??
            existingSession.stripePaymentIntentId,
          stripeSubscriptionId:
            input.stripeSubscriptionId ?? existingSession.stripeSubscriptionId,
          updatedAt: new Date(),
        })
        .where(eq(checkoutSessions.id, existingSession.id));

      const items = await tx.query.checkoutItems.findMany({
        where: eq(checkoutItems.checkoutSessionId, existingSession.id),
      });
      const serviceSubscription = input.stripeSubscriptionId
        ? await tx.query.serviceSubscriptions.findFirst({
            where: eq(
              serviceSubscriptions.stripeSubscriptionId,
              input.stripeSubscriptionId
            ),
          })
        : null;

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
      const newlyCreatedOrderIds: number[] = [];
      let paidHomePreorder = false;

      if (!hasOrdersForSession) {
        for (const item of items) {
          const metadata = (item.metadataJson ?? {}) as Record<string, unknown>;

          const serviceOrderTypes = getServiceOrderTypes(metadata);
          if (
            metadata.serviceType === "combo" &&
            serviceOrderTypes.length === 0
          ) {
            throw new Error("Combo checkout item has no service components");
          }

          const occurrenceByService = new Map<CheckoutServiceType, number>();
          for (const [
            componentIndex,
            component,
          ] of serviceOrderTypes.entries()) {
            const componentCount = serviceOrderTypes.length;
            const occurrence =
              occurrenceByService.get(component.serviceType) ?? 0;
            occurrenceByService.set(component.serviceType, occurrence + 1);
            const scheduledStartAt = getScheduledComponentDate(
              item.scheduledStartAt,
              occurrence,
              component.spacingDays
            );
            const scheduledEndAt = getScheduledComponentDate(
              item.scheduledEndAt,
              occurrence,
              component.spacingDays
            );
            const createdOrders = await tx
              .insert(orders)
              .values({
                addressId: existingSession.addressId,
                basePriceCents: allocateCents(
                  item.basePriceCents,
                  componentIndex,
                  componentCount
                ),
                checkoutSessionId: existingSession.id,
                customerId: existingSession.customerId,
                pricingTier:
                  component.serviceType === "lawncare" &&
                  (metadata.pricingTier === "small" ||
                    metadata.pricingTier === "medium" ||
                    metadata.pricingTier === "large")
                    ? metadata.pricingTier
                    : null,
                scheduledEndAt,
                scheduledStartAt,
                serviceSubscriptionId: serviceSubscription?.id ?? null,
                serviceType: component.serviceType,
                status: "paid",
                stripePaymentIntentId:
                  input.stripePaymentIntentId ??
                  existingSession.stripePaymentIntentId,
                subscriptionPeriodStart:
                  serviceSubscription?.currentPeriodStart ?? null,
                subscriptionUnitIndex: componentIndex,
                timingType: item.timingType ?? "asap",
                tipAmountCents: allocateCents(
                  item.tipAmountCents,
                  componentIndex,
                  componentCount
                ),
                totalPriceCents: allocateCents(
                  item.totalPriceCents,
                  componentIndex,
                  componentCount
                ),
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
            newlyCreatedOrderIds.push(createdOrder.id);

            await tx.insert(orderItems).values({
              amountCents: allocateCents(
                item.totalPriceCents,
                componentIndex,
                componentCount
              ),
              key: `${createdOrder.serviceType}-${componentIndex + 1}`,
              label: SERVICE_LABELS[createdOrder.serviceType],
              orderId: createdOrder.id,
            });

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
        dispatchOrderIds: newlyCreatedOrderIds,
        hasPaidHomePreorder: paidHomePreorder,
      };
    });

  const primaryOrderId = createdOrderIds[0] ?? null;

  try {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, existingSession.customerId),
    });
    const address = await db.query.addresses.findFirst({
      where: eq(addresses.id, existingSession.addressId),
    });
    const items = await db.query.checkoutItems.findMany({
      where: eq(checkoutItems.checkoutSessionId, existingSession.id),
    });

    const serviceLabels = items.map((item) => item.label).filter(Boolean);
    const primaryStart = items[0]?.scheduledStartAt ?? null;
    const primaryEnd = items[0]?.scheduledEndAt ?? null;
    const appointmentWindow = formatAppointmentWindow(primaryStart, primaryEnd);

    const formattedAddress = address
      ? (address.formattedAddress ??
        buildFormattedAddress({
          city: address.city,
          country: address.country,
          state: address.state,
          street: address.street,
          zip: address.zip,
        }))
      : "Address on file";

    const totalCents = existingSession.totalCents;
    const depositCents = getCheckoutDepositCents(totalCents);
    const isPaidInFull =
      existingSession.mode === "payment" &&
      totalCents <= STANDARD_DEPOSIT_CENTS;
    const paymentChoice = isPaidInFull
      ? "Paid in full"
      : "Deposit paid today, remaining balance invoiced upon completion";

    if (customer && primaryOrderId) {
      const customerEmailHtml = await renderBookingReceivedEmail({
        address: formattedAddress,
        appointmentWindow,
        customerName: customer.firstName,
        dashboardUrl: castleCareUrl(`/dashboard/orders/${primaryOrderId}`),
        depositCents,
        orderLabel: `Order #${primaryOrderId}`,
        paymentChoice,
        services:
          serviceLabels.length > 0 ? serviceLabels : ["CastleCare Service"],
        totalCents,
      });

      await sendEmail({
        html: customerEmailHtml.html,
        idempotencyKey: `checkout-confirmation/${existingSession.id}/customer`,
        subject: `Your CastleCare Booking is Confirmed (Order #${primaryOrderId})`,
        text: customerEmailHtml.text,
        to: customer.email,
      });

      const adminEmail = env.ADMIN_EMAIL;
      if (adminEmail) {
        const adminEmailHtml = await renderAdminBookingAlertEmail({
          address: formattedAddress,
          adminUrl: castleCareUrl(`/admin/orders/${primaryOrderId}`),
          amountDueCents: depositCents,
          appointmentWindow,
          customerEmail: customer.email,
          customerName: `${customer.firstName} ${customer.lastName}`.trim(),
          customerPhone: customer.phone,
          services:
            serviceLabels.length > 0 ? serviceLabels : ["CastleCare Service"],
        });

        await sendEmail({
          html: adminEmailHtml.html,
          idempotencyKey: `checkout-confirmation/${existingSession.id}/admin`,
          subject:
            `New Booking: Order #${primaryOrderId} - ${customer.firstName} ${customer.lastName}`.trim(),
          text: adminEmailHtml.text,
          to: adminEmail,
        });
      }
    }
  } catch (emailError) {
    logger.error(
      { checkoutSessionId: existingSession.id, err: emailError },
      "checkout:emails:failed"
    );
  }

  await publishOutboxEvent({
    eventName: "checkout_confirmed",
    payload: {
      checkoutSessionId: existingSession.id,
      customerId: existingSession.customerId,
      ...(primaryOrderId ? { orderId: primaryOrderId } : {}),
    },
  });

  // First paid order per customer only: the eventKey dedups repeat bookings,
  // and abandoned (unpaid) checkouts never reach finalization, so neither the
  // welcome email nor the admin signup alert can fire pre-payment.
  if (dispatchOrderIds.length > 0) {
    await publishOutboxEvent({
      eventKey: `customer-welcome:${existingSession.customerId}`,
      eventName: "customer_welcome",
      payload: {
        checkoutSessionId: existingSession.id,
        customerId: existingSession.customerId,
        ...(primaryOrderId ? { orderId: primaryOrderId } : {}),
      },
    });
  }

  if (hasPaidHomePreorder) {
    await publishOutboxEvent({
      eventName: "home_preorder_confirmed",
      payload: {
        checkoutSessionId: existingSession.id,
        customerId: existingSession.customerId,
      },
    });
  }

  for (const orderId of dispatchOrderIds) {
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
