import { Button } from "@callcastlecare/ui/components/button";
import { Input } from "@callcastlecare/ui/components/input";
import { Label } from "@callcastlecare/ui/components/label";
import { cn } from "@callcastlecare/ui/lib/utils";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { RefreshCw, Save, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";

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

const RouteComponent = () => {
  const { session } = useRouteContext({ from: "/_auth/dashboard" });
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncLabel, setLastSyncLabel] = useState<string | null>(null);

  const userEmail = session.data?.user.email ?? "";

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      setIsLoading(true);
      const response = await apiClient.admin.stripe.catalog.$get();
      if (!response.ok) {
        setIsLoading(false);
        return;
      }

      const payload = await response.json();
      if (!active) {
        return;
      }

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
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-lime-800">
                <ShieldCheck className="size-4" />
                CastleCare admin
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Stripe catalog control room
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Edit the service products and coupons CastleCare offers, then
                push them into Stripe when the catalog looks right.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-bold text-slate-950">{userEmail}</p>
              <p>Last sync: {lastSyncLabel ?? "Not synced yet"}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="h-11 rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800"
              disabled={isSaving || isLoading}
              onClick={saveCatalog}
              type="button"
            >
              <Save className="size-4" />
              {isSaving ? "Saving..." : "Save catalog"}
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
              {isSyncing ? "Syncing..." : "Sync to Stripe"}
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-lime-500" />
            <h2 className="text-2xl font-black">Products and prices</h2>
          </div>
          <div className="grid gap-4">
            {items.map((item, index) => (
              <div
                className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1.1fr_0.7fr_0.4fr_0.5fr_0.4fr]"
                key={item.slug}
              >
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    className="rounded-2xl"
                    onChange={(event) =>
                      updateItem(index, { name: event.target.value })
                    }
                    value={item.name}
                  />
                  <Input
                    className="rounded-2xl"
                    onChange={(event) =>
                      updateItem(index, { description: event.target.value })
                    }
                    value={item.description}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    className="rounded-2xl"
                    onChange={(event) =>
                      updateItem(index, { slug: event.target.value })
                    }
                    value={item.slug}
                  />
                  <p className="text-xs text-slate-500">
                    {item.stripeProductId ?? "No Stripe product yet"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    className="rounded-2xl"
                    min={0}
                    onChange={(event) =>
                      updateItem(index, {
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
                <div className="space-y-2">
                  <Label>Interval</Label>
                  <select
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
                    onChange={(event) =>
                      updateItem(index, {
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
                  <p className="text-xs text-slate-500">
                    {item.stripePriceId ?? "No Stripe price yet"}
                  </p>
                </div>
                <label className="flex items-center gap-2 self-center text-sm font-bold">
                  <input
                    checked={item.active}
                    onChange={(event) =>
                      updateItem(index, { active: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Active
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black">Coupons</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {coupons.map((coupon, index) => (
              <div
                className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"
                key={coupon.code}
              >
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    className="rounded-2xl"
                    onChange={(event) =>
                      updateCoupon(index, { code: event.target.value })
                    }
                    value={coupon.code}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    className="rounded-2xl"
                    onChange={(event) =>
                      updateCoupon(index, { name: event.target.value })
                    }
                    value={coupon.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Percent off</Label>
                  <Input
                    className="rounded-2xl"
                    min={0}
                    onChange={(event) =>
                      updateCoupon(index, {
                        percentOff: Number(event.target.value) || null,
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
                <p className="sm:col-span-2 text-xs text-slate-500">
                  {coupon.stripeCouponId ?? "No Stripe coupon yet"}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});
