import {
  defaultStripeCatalogItems,
  defaultStripeCoupons,
  stripeCatalogSyncRequestSchema,
} from "@callcastlecare/api";
import { and, db, desc, eq } from "@callcastlecare/db";
import {
  stripeCatalogItems,
  stripeCoupons,
  stripeSyncRuns,
} from "@callcastlecare/db/schema/index";
import { env } from "@callcastlecare/env/server";
import type { Context } from "hono";
import { Hono } from "hono";

import {
  createStripeClientOrThrow,
  ensureStripeWebhookEndpoint,
  syncStripeCatalogItem,
  syncStripeCoupon,
} from "../lib/integrations/stripe-catalog";
import { logger } from "../lib/logger";
import type { AppEnv } from "../types";

const requireAdmin = (c: Context<AppEnv>) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const adminEmail = env.ADMIN_EMAIL.toLowerCase();
  const isAdminEmail = user.email.toLowerCase() === adminEmail;
  const isAdminRole = user.role === "admin";

  if (!(isAdminEmail || isAdminRole)) {
    return c.json({ error: "forbidden" }, 403);
  }

  return null;
};

const normalizeCatalogRow = (row: typeof stripeCatalogItems.$inferSelect) => ({
  active: row.active,
  amountCents: row.amountCents,
  currency: row.currency,
  description: row.description,
  interval: row.interval ?? "one_time",
  name: row.name,
  serviceType: row.serviceType,
  slug: row.slug,
  stripePriceId: row.stripePriceId,
  stripeProductId: row.stripeProductId,
});

const normalizeCouponRow = (row: typeof stripeCoupons.$inferSelect) => ({
  active: row.active,
  amountOffCents: row.amountOffCents,
  code: row.code,
  currency: row.currency,
  duration: row.duration,
  durationInMonths: row.durationInMonths,
  name: row.name,
  percentOff: row.percentOff,
  stripeCouponId: row.stripeCouponId,
});

const seedCatalogIfEmpty = async () => {
  const [existingItems, existingCoupons] = await Promise.all([
    db.query.stripeCatalogItems.findMany(),
    db.query.stripeCoupons.findMany(),
  ]);

  const itemBySlug = new Map(existingItems.map((item) => [item.slug, item]));
  const couponByCode = new Map(
    existingCoupons.map((coupon) => [coupon.code, coupon])
  );

  await Promise.all(
    defaultStripeCatalogItems.map((item) => {
      const existing = itemBySlug.get(item.slug);
      const metadata = existing?.metadataJson as
        | { source?: string }
        | null
        | undefined;
      const shouldRefresh = !existing || metadata?.source === "default";

      if (!shouldRefresh) {
        return null;
      }

      return db
        .insert(stripeCatalogItems)
        .values({
          active: item.active,
          amountCents: item.amountCents,
          currency: item.currency,
          description: item.description,
          interval: item.interval,
          metadataJson: {
            source: "default",
          },
          name: item.name,
          serviceType: item.serviceType,
          slug: item.slug,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          set: {
            active: item.active,
            amountCents: item.amountCents,
            currency: item.currency,
            description: item.description,
            interval: item.interval,
            metadataJson: {
              source: "default",
            },
            name: item.name,
            serviceType: item.serviceType,
            updatedAt: new Date(),
          },
          target: stripeCatalogItems.slug,
        });
    })
  );

  await Promise.all(
    defaultStripeCoupons.map((coupon) => {
      const existing = couponByCode.get(coupon.code);
      const metadata = existing?.metadataJson as
        | { source?: string }
        | null
        | undefined;
      const shouldRefresh = !existing || metadata?.source === "default";

      if (!shouldRefresh) {
        return null;
      }

      return db
        .insert(stripeCoupons)
        .values({
          active: coupon.active,
          amountOffCents: coupon.amountOffCents,
          code: coupon.code,
          currency: coupon.currency,
          duration: coupon.duration,
          durationInMonths: coupon.durationInMonths,
          metadataJson: {
            source: "default",
          },
          name: coupon.name,
          percentOff: coupon.percentOff,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          set: {
            active: coupon.active,
            amountOffCents: coupon.amountOffCents,
            currency: coupon.currency,
            duration: coupon.duration,
            durationInMonths: coupon.durationInMonths,
            metadataJson: {
              source: "default",
            },
            name: coupon.name,
            percentOff: coupon.percentOff,
            updatedAt: new Date(),
          },
          target: stripeCoupons.code,
        });
    })
  );
};

export const adminRoutes = new Hono<AppEnv>()
  .get("/stripe/catalog", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    await seedCatalogIfEmpty();

    const [items, coupons, syncRuns] = await Promise.all([
      db.query.stripeCatalogItems.findMany({
        orderBy: (table, { asc }) => [asc(table.serviceType), asc(table.slug)],
      }),
      db.query.stripeCoupons.findMany({
        orderBy: (table, { asc }) => [asc(table.code)],
      }),
      db
        .select()
        .from(stripeSyncRuns)
        .orderBy(desc(stripeSyncRuns.createdAt))
        .limit(5),
    ]);

    return c.json(
      {
        adminEmail: env.ADMIN_EMAIL,
        coupons: coupons.map(normalizeCouponRow),
        items: items.map(normalizeCatalogRow),
        lastSync: syncRuns[0] ?? null,
        syncRuns,
      },
      200
    );
  })
  .put("/stripe/catalog", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    const body = await c.req.json();
    const parsed = stripeCatalogSyncRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    await Promise.all(
      parsed.data.items.map((item) =>
        db
          .insert(stripeCatalogItems)
          .values({
            active: item.active,
            amountCents: item.amountCents,
            currency: item.currency,
            description: item.description,
            interval: item.interval,
            metadataJson: {
              source: "admin",
            },
            name: item.name,
            serviceType: item.serviceType,
            slug: item.slug,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            set: {
              active: item.active,
              amountCents: item.amountCents,
              currency: item.currency,
              description: item.description,
              interval: item.interval,
              name: item.name,
              serviceType: item.serviceType,
              updatedAt: new Date(),
            },
            target: stripeCatalogItems.slug,
          })
      )
    );

    await Promise.all(
      parsed.data.coupons.map((coupon) =>
        db
          .insert(stripeCoupons)
          .values({
            active: coupon.active,
            amountOffCents: coupon.amountOffCents,
            code: coupon.code,
            currency: coupon.currency,
            duration: coupon.duration,
            durationInMonths: coupon.durationInMonths,
            metadataJson: {
              source: "admin",
            },
            name: coupon.name,
            percentOff: coupon.percentOff,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            set: {
              active: coupon.active,
              amountOffCents: coupon.amountOffCents,
              currency: coupon.currency,
              duration: coupon.duration,
              durationInMonths: coupon.durationInMonths,
              name: coupon.name,
              percentOff: coupon.percentOff,
              updatedAt: new Date(),
            },
            target: stripeCoupons.code,
          })
      )
    );

    return c.json({ ok: true }, 200);
  })
  .post("/stripe/sync", async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) {
      return adminError;
    }

    await seedCatalogIfEmpty();

    const items = await db.query.stripeCatalogItems.findMany({
      where: eq(stripeCatalogItems.active, true),
    });
    const coupons = await db.query.stripeCoupons.findMany({
      where: eq(stripeCoupons.active, true),
    });

    try {
      const stripe = createStripeClientOrThrow();
      const syncedItems = await Promise.all(
        items.map(async (row) => {
          const synced = await syncStripeCatalogItem(stripe, {
            active: row.active,
            amountCents: row.amountCents,
            currency: row.currency,
            description: row.description,
            interval: row.interval as "month" | "one_time" | "week" | "year",
            name: row.name,
            serviceType: row.serviceType as
              | "combo"
              | "fee"
              | "laundry"
              | "lawncare"
              | "window_washing",
            slug: row.slug,
          });

          await db
            .update(stripeCatalogItems)
            .set({
              stripePriceId: synced.stripePriceId,
              stripeProductId: synced.stripeProductId,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(stripeCatalogItems.slug, row.slug),
                eq(stripeCatalogItems.id, row.id)
              )
            );
          return { slug: row.slug, ...synced };
        })
      );

      const syncedCoupons = await Promise.all(
        coupons.map(async (row) => {
          const synced = await syncStripeCoupon(stripe, {
            active: row.active,
            amountOffCents: row.amountOffCents,
            code: row.code,
            currency: row.currency,
            duration:
              row.duration === "forever" || row.duration === "repeating"
                ? row.duration
                : "once",
            durationInMonths: row.durationInMonths,
            name: row.name,
            percentOff: row.percentOff,
          });

          await db
            .update(stripeCoupons)
            .set({
              stripeCouponId: synced.stripeCouponId,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(stripeCoupons.code, row.code),
                eq(stripeCoupons.id, row.id)
              )
            );
          return { code: row.code, ...synced };
        })
      );

      const webhookEndpointId = await ensureStripeWebhookEndpoint(stripe);

      const syncRunRows = await db
        .insert(stripeSyncRuns)
        .values({
          catalogItemCount: syncedItems.length,
          couponCount: syncedCoupons.length,
          metadataJson: {
            coupons: syncedCoupons,
            items: syncedItems,
          },
          status: "success",
          stripeWebhookEndpointId: webhookEndpointId,
        })
        .returning();

      return c.json(
        {
          coupons: syncedCoupons,
          items: syncedItems,
          syncRun: syncRunRows[0],
          webhookEndpointId,
        },
        200
      );
    } catch (error) {
      logger.error({ error }, "stripe_catalog:sync_failed");
      const message =
        error instanceof Error ? error.message : "Stripe sync failed";

      await db.insert(stripeSyncRuns).values({
        catalogItemCount: items.length,
        couponCount: coupons.length,
        errorMessage: message,
        status: "failed",
      });

      return c.json({ error: message }, 500);
    }
  });
