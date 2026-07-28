/* eslint-disable max-statements */
import {
  and,
  db,
  desc,
  eq,
  isNull,
  lte,
  notInArray,
  or,
  sql,
} from "@callcastlecare/db";
import {
  addresses,
  assignments,
  dispatchBatches,
  dispatchOffers,
  orders,
  workers,
} from "@callcastlecare/db/schema/index";

import { logger } from "./logger";
import { publishOutboxEvent } from "./outbox";
import { enqueueMessage, QUEUE_TOPICS } from "./queue";

const OFFER_EXPIRATION_SECONDS = 120;
const DISPATCH_WAVE_INTERVAL_MS = 15 * 60 * 1000;
const DISPATCH_BONUS_STEP_MS = 5 * 60 * 1000;
const AUTO_RESCHEDULE_AFTER_MS = 30 * 60 * 1000;
const AUTO_RESCHEDULE_OFFSET_MS = 60 * 60 * 1000;
const AUTO_RESCHEDULE_WINDOW_MS = 2 * 60 * 60 * 1000;
const MAX_DISPATCH_BONUS_CENTS = 600;
const MAX_OFFERS_PER_BATCH = 5;

const toNumberOrNull = (value: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const milesBetween = (
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) => {
  const earthRadiusMiles = 3958.8;
  const deltaLatitude = toRadians(second.latitude - first.latitude);
  const deltaLongitude = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getRadiusForSequence = (sequence: number) => {
  if (sequence <= 1) {
    return 15;
  }

  if (sequence === 2) {
    return 30;
  }

  if (sequence === 3) {
    return 45;
  }

  return 60;
};

const getDispatchBonusCents = (dispatchStartedAt: Date, now: Date) => {
  const elapsedMs = Math.max(0, now.getTime() - dispatchStartedAt.getTime());
  const increments = Math.floor(elapsedMs / DISPATCH_BONUS_STEP_MS);
  return Math.min(MAX_DISPATCH_BONUS_CENTS, increments * 100);
};

const getNextWaveAt = (from: Date) => {
  const base = Math.floor(from.getTime() / DISPATCH_WAVE_INTERVAL_MS);
  return new Date((base + 1) * DISPATCH_WAVE_INTERVAL_MS);
};

const toDelaySeconds = (targetAt: Date, now: Date) =>
  Math.max(1, Math.ceil((targetAt.getTime() - now.getTime()) / 1000));

const ceilToQuarterHour = (date: Date) => {
  const quarterMs = 15 * 60 * 1000;
  const rounded = Math.ceil(date.getTime() / quarterMs) * quarterMs;
  return new Date(rounded);
};

const getEligibleWorkers = async (input: {
  excludedWorkerIds: number[];
  now: Date;
  orderId: number;
  radiusMiles: number;
}) => {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, input.orderId),
  });

  if (!order) {
    return [];
  }

  const address = await db.query.addresses.findFirst({
    where: eq(addresses.id, order.addressId),
  });

  if (!address) {
    return [];
  }

  const activeAssignments = await db.query.assignments.findMany({
    columns: {
      workerId: true,
    },
    where: eq(assignments.status, "active"),
  });

  const unavailableWorkerIds = activeAssignments.map((entry) => entry.workerId);
  const excludedWorkerIds = [
    ...new Set([...input.excludedWorkerIds, ...unavailableWorkerIds]),
  ];

  const candidateWhere =
    excludedWorkerIds.length > 0
      ? and(
          eq(workers.isActive, true),
          eq(workers.onboardingStatus, "approved"),
          or(
            isNull(workers.nextOfferEligibleAt),
            lte(workers.nextOfferEligibleAt, input.now)
          ),
          notInArray(workers.id, excludedWorkerIds)
        )
      : and(
          eq(workers.isActive, true),
          eq(workers.onboardingStatus, "approved"),
          or(
            isNull(workers.nextOfferEligibleAt),
            lte(workers.nextOfferEligibleAt, input.now)
          )
        );

  const candidates = await db.query.workers.findMany({
    orderBy: desc(workers.lastLocationUpdatedAt),
    where: candidateWhere,
  });

  const orderLatitude = toNumberOrNull(address.latitude);
  const orderLongitude = toNumberOrNull(address.longitude);

  const withDistance = candidates
    .filter((candidate) =>
      candidate.servicesOffered.includes(order.serviceType)
    )
    .map((candidate) => {
      const workerLatitude = toNumberOrNull(candidate.currentLatitude);
      const workerLongitude = toNumberOrNull(candidate.currentLongitude);

      if (
        orderLatitude === null ||
        orderLongitude === null ||
        workerLatitude === null ||
        workerLongitude === null
      ) {
        return {
          distanceMiles: Number.POSITIVE_INFINITY,
          worker: candidate,
        };
      }

      return {
        distanceMiles: milesBetween(
          {
            latitude: orderLatitude,
            longitude: orderLongitude,
          },
          {
            latitude: workerLatitude,
            longitude: workerLongitude,
          }
        ),
        worker: candidate,
      };
    })
    .filter(({ distanceMiles, worker }) => {
      if (!Number.isFinite(distanceMiles)) {
        return true;
      }

      const effectiveRadiusMiles = Math.max(
        input.radiusMiles,
        worker.serviceRadiusMiles
      );
      return distanceMiles <= effectiveRadiusMiles;
    })
    // eslint-disable-next-line unicorn/no-array-sort -- ES2022 target does not include Array.prototype.toSorted.
    .sort((first, second) => first.distanceMiles - second.distanceMiles)
    .slice(0, MAX_OFFERS_PER_BATCH);

  if (
    orderLatitude === null ||
    orderLongitude === null ||
    withDistance.length === 0
  ) {
    return withDistance.map((entry) => entry.worker);
  }

  const geoCandidateIds = withDistance.map((entry) => entry.worker.id);
  const target = sql`ST_SetSRID(ST_MakePoint(${orderLongitude}, ${orderLatitude}), 4326)::geography`;
  const maxRadiusMeters = input.radiusMiles * 1609.34;

  const distanceResult = await db.execute(sql`
    SELECT
      "id",
      ST_Distance("location", ${target}) / 1609.34 AS distance_miles
    FROM "workers"
    WHERE "id" IN (${sql.join(
      geoCandidateIds.map((id) => sql`${id}`),
      sql`,`
    )})
      AND "location" IS NOT NULL
      AND ST_DWithin("location", ${target}, ${maxRadiusMeters})
  `);

  const distanceRows = distanceResult.rows as {
    distance_miles: number | string;
    id: number;
  }[];
  const distanceByWorkerId = new Map<number, number>();

  for (const row of distanceRows) {
    const parsedDistance =
      typeof row.distance_miles === "number"
        ? row.distance_miles
        : Number(row.distance_miles);

    if (Number.isFinite(parsedDistance)) {
      distanceByWorkerId.set(row.id, parsedDistance);
    }
  }

  const ranked = withDistance
    .filter((entry) => {
      const geoDistance = distanceByWorkerId.get(entry.worker.id);
      return (
        geoDistance !== undefined ||
        !Number.isFinite(entry.distanceMiles) ||
        entry.distanceMiles <= input.radiusMiles
      );
    })
    .map((entry) => ({
      distanceMiles:
        distanceByWorkerId.get(entry.worker.id) ?? entry.distanceMiles,
      worker: entry.worker,
    }))
    // eslint-disable-next-line unicorn/no-array-sort -- ES2022 target does not include Array.prototype.toSorted.
    .sort((first, second) => first.distanceMiles - second.distanceMiles)
    .slice(0, MAX_OFFERS_PER_BATCH);

  return ranked.map((entry) => entry.worker);
};

export const dispatchOrder = async (input: {
  orderId: number;
  sequence?: number;
}) => {
  const sequence = Math.max(1, input.sequence ?? 1);
  const now = new Date();

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, input.orderId),
  });

  if (!order) {
    return;
  }

  if (
    order.assignedWorkerId ||
    [
      "assigned",
      "arrived",
      "in_progress",
      "completed",
      "cancelled",
      "failed",
    ].includes(order.status)
  ) {
    return;
  }

  const dispatchStartedAt = order.dispatchStartedAt ?? now;
  const elapsedMs = Math.max(0, now.getTime() - dispatchStartedAt.getTime());

  let { autoRescheduledAt } = order;
  let { timingType } = order;
  let { scheduledStartAt } = order;
  let { scheduledEndAt } = order;

  if (
    timingType === "asap" &&
    autoRescheduledAt === null &&
    elapsedMs >= AUTO_RESCHEDULE_AFTER_MS
  ) {
    const nextScheduledStartAt = ceilToQuarterHour(
      new Date(now.getTime() + AUTO_RESCHEDULE_OFFSET_MS)
    );
    const nextScheduledEndAt = new Date(
      nextScheduledStartAt.getTime() + AUTO_RESCHEDULE_WINDOW_MS
    );

    await db
      .update(orders)
      .set({
        autoRescheduledAt: now,
        scheduledEndAt: nextScheduledEndAt,
        scheduledStartAt: nextScheduledStartAt,
        timingType: "scheduled",
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    await publishOutboxEvent({
      eventName: "order_auto_rescheduled",
      payload: {
        orderId: order.id,
        scheduledEndAt: nextScheduledEndAt.toISOString(),
        scheduledStartAt: nextScheduledStartAt.toISOString(),
      },
    });

    autoRescheduledAt = now;
    timingType = "scheduled";
    scheduledStartAt = nextScheduledStartAt;
    scheduledEndAt = nextScheduledEndAt;
  }

  const dispatchBonusCents = getDispatchBonusCents(dispatchStartedAt, now);

  const offeredWorkers = await db.query.dispatchOffers.findMany({
    columns: {
      workerId: true,
    },
    where: eq(dispatchOffers.orderId, order.id),
  });

  const radiusMiles = getRadiusForSequence(sequence);

  const workersToOffer = await getEligibleWorkers({
    excludedWorkerIds: offeredWorkers.map((entry) => entry.workerId),
    now,
    orderId: order.id,
    radiusMiles,
  });

  if (workersToOffer.length > 0) {
    const expiresAt = new Date(now.getTime() + OFFER_EXPIRATION_SECONDS * 1000);

    const insertedBatches = await db
      .insert(dispatchBatches)
      .values({
        expiresAt,
        orderId: order.id,
        radiusMiles,
        sequence,
      })
      .returning({ id: dispatchBatches.id });

    const [batch] = insertedBatches;

    if (batch) {
      await db
        .insert(dispatchOffers)
        .values(
          workersToOffer.map((worker) => ({
            bonusCents: dispatchBonusCents,
            dispatchBatchId: batch.id,
            expiresAt,
            orderId: order.id,
            status: "pending" as const,
            workerId: worker.id,
          }))
        )
        .onConflictDoNothing();

      await publishOutboxEvent({
        eventName: "order_dispatched",
        payload: {
          orderId: order.id,
          sequence,
        },
      });

      logger.info(
        {
          batchId: batch.id,
          dispatchBonusCents,
          offeredWorkerIds: workersToOffer.map((worker) => worker.id),
          orderId: order.id,
          radiusMiles,
          sequence,
        },
        "dispatch:batch_created"
      );
    }
  }

  const nextWaveAt = getNextWaveAt(now);

  await db
    .update(orders)
    .set({
      autoRescheduledAt,
      dispatchBonusCents,
      dispatchStartedAt,
      nextWaveAt,
      scheduledEndAt,
      scheduledStartAt,
      status: "dispatching",
      timingType,
      updatedAt: now,
    })
    .where(eq(orders.id, order.id));

  await enqueueMessage(
    QUEUE_TOPICS.dispatchRetry,
    {
      orderId: order.id,
      sequence: sequence + 1,
    },
    {
      delaySeconds: toDelaySeconds(nextWaveAt, now),
    }
  );
};

export const expirePendingOffers = async (orderId: number) => {
  await db
    .update(dispatchOffers)
    .set({
      respondedAt: new Date(),
      status: "expired",
    })
    .where(
      and(
        eq(dispatchOffers.orderId, orderId),
        eq(dispatchOffers.status, "pending"),
        or(
          isNull(dispatchOffers.expiresAt),
          lte(dispatchOffers.expiresAt, new Date())
        )
      )
    );
};
