import {
  getStripeCatalogProductKey,
  getStripeCatalogProductName,
} from "@callcastlecare/api";
import { Button } from "@callcastlecare/ui/components/button";
import { Input } from "@callcastlecare/ui/components/input";
import { Label } from "@callcastlecare/ui/components/label";
import { cn } from "@callcastlecare/ui/lib/utils";
import {
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";
import { RefreshCw, Save, ShoppingBag, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/dashboard/app-shell";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";

interface SessionPayload {
  isAdmin?: boolean;
  user?: {
    email?: string;
  };
}

interface CatalogItem {
  active: boolean;
  amountCents: number;
  currency: string;
  description: string;
  interval: "month" | "one_time" | "week" | "year";
  name: string;
  serviceType: "combo" | "fee" | "laundry" | "lawncare" | "window_washing";
  slug: string;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
}

interface Coupon {
  active: boolean;
  amountOffCents?: number | null;
  code: string;
  currency: string;
  duration: "forever" | "once" | "repeating";
  durationInMonths?: number | null;
  name: string;
  percentOff?: number | null;
  stripeCouponId?: string | null;
}

const getAdminSession = async () => {
  const response = await fetch(new URL("/api/v1/me", getServerUrl()), {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SessionPayload;
};

const formatCents = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);

const normalizeInterval = (value: string): CatalogItem["interval"] => {
  if (value === "week" || value === "month" || value === "year") {
    return value;
  }

  return "one_time";
};

const groupCatalogItems = (items: CatalogItem[]) => {
  const groups = new Map<
    string,
    {
      items: { item: CatalogItem; originalIndex: number }[];
      name: string;
      serviceType: CatalogItem["serviceType"];
    }
  >();

  for (const [originalIndex, item] of items.entries()) {
    const key = getStripeCatalogProductKey(item);
    const existing = groups.get(key);

    if (existing) {
      existing.items.push({ item, originalIndex });
      continue;
    }

    groups.set(key, {
      items: [{ item, originalIndex }],
      name: getStripeCatalogProductName(item),
      serviceType: item.serviceType,
    });
  }

  return [...groups.entries()];
};

const AdminCatalogRoute = () => {
  const { session } = useRouteContext({ from: "/admin_/catalog" });
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncLabel, setLastSyncLabel] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      setIsLoading(true);
      const response = await apiClient.admin.stripe.catalog.$get();
      if (!active) {
        return;
      }

      if (!response.ok) {
        setIsLoading(false);
        return;
      }

      const payload = await response.json();
      setItems(payload.items as CatalogItem[]);
      setCoupons(payload.coupons as Coupon[]);
      setLastSyncLabel(
        payload.lastSync?.createdAt
          ? new Date(payload.lastSync.createdAt).toLocaleString()
          : null
      );
      setIsLoading(false);
    };

    const runLoadCatalog = async () => {
      try {
        await loadCatalog();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Catalog load failed"
        );
        setIsLoading(false);
      }
    };

    void runLoadCatalog();

    return () => {
      active = false;
    };
  }, []);

  const catalogGroups = groupCatalogItems(items);

  const updateItem = (index: number, next: Partial<CatalogItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...next } : item
      )
    );
  };

  const updateCoupon = (index: number, next: Partial<Coupon>) => {
    setCoupons((current) =>
      current.map((coupon, couponIndex) =>
        couponIndex === index ? { ...coupon, ...next } : coupon
      )
    );
  };

  const saveCatalog = async () => {
    setIsSaving(true);
    const response = await apiClient.admin.stripe.catalog.$put({
      json: { coupons, items },
    });
    setIsSaving(false);

    if (!response.ok) {
      toast.error("Catalog save failed");
      return;
    }

    toast.success("Catalog saved");
  };

  const syncCatalog = async () => {
    setIsSyncing(true);
    const response = await apiClient.admin.stripe.sync.$post();
    setIsSyncing(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      toast.error(payload?.error ?? "Stripe sync failed");
      return;
    }

    const payload = await response.json();
    setLastSyncLabel(new Date().toLocaleString());
    toast.success(
      `Synced ${payload.items.length} products and ${payload.coupons.length} coupons`
    );
  };

  return (
    <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
      <main className="px-4 py-6 text-slate-950 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6">
          <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                <ShoppingBag className="size-4" />
                Stripe catalog
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Products and prices
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Edit CastleCare products as clean product groups with multiple
                price configurations underneath.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="h-11 rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800"
                disabled={isSaving || isLoading}
                onClick={saveCatalog}
                type="button"
              >
                <Save className="size-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                className="h-11 rounded-full bg-lime-300 px-5 font-bold text-slate-950 hover:bg-lime-200"
                disabled={isSyncing || isLoading}
                onClick={syncCatalog}
                type="button"
              >
                <RefreshCw
                  className={cn("size-4", isSyncing ? "animate-spin" : "")}
                />
                {isSyncing ? "Syncing..." : "Sync"}
              </Button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm font-bold text-slate-500">Products</p>
                <p className="mt-2 text-3xl font-black">
                  {isLoading ? "..." : catalogGroups.length}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500">Prices</p>
                <p className="mt-2 text-3xl font-black">
                  {isLoading ? "..." : items.length}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500">Last sync</p>
                <p className="mt-2 text-sm font-black">
                  {lastSyncLabel ?? "Not synced yet"}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            {catalogGroups.map(([groupKey, group]) => (
              <article
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                key={groupKey}
              >
                <div className="flex flex-col gap-3 border-slate-200 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      {group.name}
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase text-slate-500">
                      {group.serviceType.replaceAll("_", " ")} ·{" "}
                      {group.items.length} price
                      {group.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {groupKey}
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  {group.items.map(({ item, originalIndex }) => (
                    <div
                      className="grid gap-3 rounded-2xl bg-slate-50 p-4 xl:grid-cols-[1.3fr_0.8fr_0.45fr_0.45fr_auto]"
                      key={originalIndex}
                    >
                      <div className="grid gap-2">
                        <Label>Name and description</Label>
                        <Input
                          className="rounded-2xl bg-white"
                          onChange={(event) =>
                            updateItem(originalIndex, {
                              name: event.target.value,
                            })
                          }
                          value={item.name}
                        />
                        <Input
                          className="rounded-2xl bg-white"
                          onChange={(event) =>
                            updateItem(originalIndex, {
                              description: event.target.value,
                            })
                          }
                          value={item.description}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Slug</Label>
                        <Input
                          className="rounded-2xl bg-white"
                          onChange={(event) =>
                            updateItem(originalIndex, {
                              slug: event.target.value,
                            })
                          }
                          value={item.slug}
                        />
                        <p className="truncate text-xs text-slate-500">
                          {item.stripeProductId ?? "No Stripe product yet"}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <Label>Price</Label>
                        <Input
                          className="rounded-2xl bg-white"
                          min={0}
                          onChange={(event) =>
                            updateItem(originalIndex, {
                              amountCents: Math.round(
                                Number(event.target.value) * 100
                              ),
                            })
                          }
                          step="0.01"
                          type="number"
                          value={item.amountCents / 100}
                        />
                        <p className="text-xs font-bold text-slate-500">
                          {formatCents(item.amountCents)}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <Label>Interval</Label>
                        <select
                          className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
                          onChange={(event) =>
                            updateItem(originalIndex, {
                              interval: normalizeInterval(event.target.value),
                            })
                          }
                          value={item.interval}
                        >
                          <option value="one_time">One-time</option>
                          <option value="week">Weekly</option>
                          <option value="month">Monthly</option>
                          <option value="year">Yearly</option>
                        </select>
                        <p className="truncate text-xs text-slate-500">
                          {item.stripePriceId ?? "No Stripe price yet"}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 self-center text-sm font-bold">
                        <input
                          checked={item.active}
                          onChange={(event) =>
                            updateItem(originalIndex, {
                              active: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                        Active
                      </label>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="grid gap-4">
            <div className="flex items-center gap-2">
              <Tag className="size-5 text-lime-600" />
              <h2 className="text-2xl font-black">Coupons</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {coupons.map((coupon, index) => (
                <article
                  className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"
                  key={coupon.stripeCouponId ?? index}
                >
                  <div className="grid gap-2">
                    <Label>Code</Label>
                    <Input
                      className="rounded-2xl"
                      onChange={(event) =>
                        updateCoupon(index, { code: event.target.value })
                      }
                      value={coupon.code}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input
                      className="rounded-2xl"
                      onChange={(event) =>
                        updateCoupon(index, { name: event.target.value })
                      }
                      value={coupon.name}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Percent off</Label>
                    <Input
                      className="rounded-2xl"
                      min={0}
                      onChange={(event) =>
                        updateCoupon(index, {
                          percentOff:
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        })
                      }
                      type="number"
                      value={coupon.percentOff ?? ""}
                    />
                  </div>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold">
                    <input
                      checked={coupon.active}
                      onChange={(event) =>
                        updateCoupon(index, { active: event.target.checked })
                      }
                      type="checkbox"
                    />
                    Active
                  </label>
                  <p className="text-xs text-slate-500 sm:col-span-2">
                    {coupon.stripeCouponId ?? "No Stripe coupon yet"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
};

export const Route = createFileRoute("/admin_/catalog")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        search: { redirectTo: "/admin/catalog" },
        to: "/sign-in",
      });
    }

    const adminSession = await getAdminSession();
    if (!adminSession?.isAdmin) {
      throw redirect({
        to: "/dashboard",
      });
    }

    return { session: adminSession };
  },
  component: AdminCatalogRoute,
  ssr: false,
});
