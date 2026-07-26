/* eslint-disable max-statements */
import { and, db, eq, isNull, lte } from "@callcastlecare/db";
import {
  earningsLedger,
  payouts,
  tipHolds,
  workers,
} from "@callcastlecare/db/schema/index";

import { releaseWorkerPayout } from "./integrations/stripe-connect";
import { logger } from "./logger";
import { enqueueMessage, QUEUE_TOPICS } from "./queue";

const BASE_PAY_RATIO = 0.7;

export const createCompletionPayoutRecords = async (input: {
  dispatchBonusCents?: number;
  orderId: number;
  totalBasePriceCents: number;
  tipAmountCents: number;
  workerId: number;
}) => {
  const basePayCents = Math.max(
    0,
    Math.round(input.totalBasePriceCents * BASE_PAY_RATIO)
  );

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
    const scheduledReleaseAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(tipHolds).values({
      amountCents: input.tipAmountCents,
      orderId: input.orderId,
      scheduledReleaseAt,
      workerId: input.workerId,
    });

    await enqueueMessage(
      QUEUE_TOPICS.tipRelease,
      {
        orderId: input.orderId,
      },
      {
        delaySeconds: 60 * 60,
      }
    );
  }

  const worker = await db.query.workers.findFirst({
    columns: {
      stripeAccountId: true,
    },
    where: eq(workers.id, input.workerId),
  });

  if (!worker?.stripeAccountId) {
    await db.insert(payouts).values({
      amountCents: basePayCents,
      status: "pending",
      workerId: input.workerId,
    });
    return;
  }

  const transfer = await releaseWorkerPayout({
    amountCents: basePayCents,
    workerStripeAccountId: worker.stripeAccountId,
  });

  await db.insert(payouts).values({
    amountCents: basePayCents,
    paidAt: transfer.success ? new Date() : null,
    providerPayoutId: transfer.providerPayoutId,
    status: transfer.success ? "paid" : "failed",
    workerId: input.workerId,
  });
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

  for (const hold of holds) {
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
  }
};
