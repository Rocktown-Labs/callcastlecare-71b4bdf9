import { and, db, eq, isNull, lte } from "@callcastlecare/db";
import {
  earningsLedger,
  payouts,
  tipHolds,
  workers,
} from "@callcastlecare/db/schema/index";
import { env } from "@callcastlecare/env/server";

import { releaseWorkerPayout } from "./integrations/stripe-connect";
import { logger } from "./logger";

const createWorkerEarnings = async (
  input: {
    dispatchBonusCents?: number;
    orderId: number;
    tipAmountCents: number;
    workerId: number;
  },
  basePayCents: number
) => {
  await db.insert(earningsLedger).values({
    amountCents: basePayCents,
    earningType: "base_pay",
    orderId: input.orderId,
    releaseAt: new Date(),
    workerId: input.workerId,
  });

  const dispatchBonusCents = Math.max(0, input.dispatchBonusCents ?? 0);
  if (dispatchBonusCents > 0) {
    await db.insert(earningsLedger).values({
      amountCents: dispatchBonusCents,
      earningType: "adjustment",
      orderId: input.orderId,
      releaseAt: new Date(),
      workerId: input.workerId,
    });
  }

  if (input.tipAmountCents > 0) {
    await db.insert(earningsLedger).values({
      amountCents: input.tipAmountCents,
      earningType: "tip",
      orderId: input.orderId,
      releaseAt: new Date(),
      workerId: input.workerId,
    });
  }
};

const createPayoutRecord = async (input: {
  amountCents: number;
  orderId: number;
  workerId: number;
}) => {
  const worker = await db.query.workers.findFirst({
    columns: {
      stripeAccountId: true,
      stripeAccountStatus: true,
      stripePayoutsEnabled: true,
    },
    where: eq(workers.id, input.workerId),
  });

  const isReady = Boolean(
    worker?.stripeAccountId &&
    worker.stripeAccountStatus === "ready" &&
    worker.stripePayoutsEnabled
  );
  if (!isReady || !worker?.stripeAccountId) {
    await db.insert(payouts).values({
      amountCents: input.amountCents,
      orderId: input.orderId,
      status: "pending",
      workerId: input.workerId,
    });
    return;
  }

  const transfer = await releaseWorkerPayout({
    amountCents: input.amountCents,
    orderId: input.orderId,
    workerStripeAccountId: worker.stripeAccountId,
  });

  await db.insert(payouts).values({
    amountCents: input.amountCents,
    orderId: input.orderId,
    paidAt: transfer.success ? new Date() : null,
    providerPayoutId: transfer.providerPayoutId,
    status: transfer.success ? "paid" : "failed",
    workerId: input.workerId,
  });
};

export const createCompletionPayoutRecords = async (input: {
  dispatchBonusCents?: number;
  orderId: number;
  tipAmountCents: number;
  totalBasePriceCents: number;
  workerId: number;
}) => {
  const existingPayout = await db.query.payouts.findFirst({
    where: eq(payouts.orderId, input.orderId),
  });
  if (existingPayout) {
    return existingPayout;
  }

  const basePayCents = Math.max(
    0,
    Math.round((input.totalBasePriceCents * env.PROVIDER_PAYOUT_BPS) / 10_000)
  );
  const dispatchBonusCents = Math.max(0, input.dispatchBonusCents ?? 0);
  const payoutAmountCents =
    basePayCents + dispatchBonusCents + Math.max(0, input.tipAmountCents);

  await createWorkerEarnings(input, basePayCents);
  await createPayoutRecord({
    amountCents: payoutAmountCents,
    orderId: input.orderId,
    workerId: input.workerId,
  });

  return db.query.payouts.findFirst({
    where: eq(payouts.orderId, input.orderId),
  });
};

export const releasePendingWorkerPayouts = async (workerId: number) => {
  const worker = await db.query.workers.findFirst({
    columns: {
      stripeAccountId: true,
      stripeAccountStatus: true,
      stripePayoutsEnabled: true,
    },
    where: eq(workers.id, workerId),
  });
  if (
    !(
      worker?.stripeAccountId &&
      worker.stripeAccountStatus === "ready" &&
      worker.stripePayoutsEnabled
    )
  ) {
    return [] as number[];
  }

  const pendingPayouts = await db.query.payouts.findMany({
    where: and(eq(payouts.workerId, workerId), eq(payouts.status, "pending")),
  });
  const workerStripeAccountId = worker.stripeAccountId;
  const settlementResults = await Promise.all(
    pendingPayouts.map(async (payout) => {
      if (!payout.orderId) {
        return null;
      }
      const transfer = await releaseWorkerPayout({
        amountCents: payout.amountCents,
        orderId: payout.orderId,
        workerStripeAccountId,
      });
      if (!transfer.success) {
        return null;
      }
      await db
        .update(payouts)
        .set({
          paidAt: new Date(),
          providerPayoutId: transfer.providerPayoutId,
          status: "paid",
        })
        .where(and(eq(payouts.id, payout.id), eq(payouts.status, "pending")));
      return payout.id;
    })
  );
  const settledPayoutIds = settlementResults.filter(
    (payoutId): payoutId is number => payoutId !== null
  );

  logger.info(
    { settledPayoutIds, workerId },
    "stripe_connect:pending_payouts_released"
  );
  return settledPayoutIds;
};

export const releaseEligibleTipHolds = async (orderId?: number) => {
  const holds = await db.query.tipHolds.findMany({
    where:
      orderId === undefined
        ? and(
            isNull(tipHolds.releasedAt),
            lte(tipHolds.scheduledReleaseAt, new Date())
          )
        : and(
            eq(tipHolds.orderId, orderId),
            isNull(tipHolds.releasedAt),
            lte(tipHolds.scheduledReleaseAt, new Date())
          ),
  });

  await Promise.all(
    holds.map(async (hold) => {
      await db.insert(earningsLedger).values({
        amountCents: hold.amountCents,
        earningType: "tip",
        orderId: hold.orderId,
        releaseAt: new Date(),
        workerId: hold.workerId,
      });

      await db
        .update(tipHolds)
        .set({
          releasedAt: new Date(),
        })
        .where(eq(tipHolds.id, hold.id));

      logger.info(
        {
          amountCents: hold.amountCents,
          holdId: hold.id,
          orderId: hold.orderId,
        },
        "tip_hold:released"
      );
    })
  );
};
