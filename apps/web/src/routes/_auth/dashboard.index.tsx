import {
  getStripeCatalogProductKey,
  getStripeCatalogProductName,
} from "@callcastlecare/api";
import { Button } from "@callcastlecare/ui/components/button";
import { Input } from "@callcastlecare/ui/components/input";
import { Label } from "@callcastlecare/ui/components/label";
import { cn } from "@callcastlecare/ui/lib/utils";
import { Link, createFileRoute, useRouteContext } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Inbox,
  MapPin,
  RefreshCw,
  ReceiptText,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { getServerUrl } from "@/lib/server-url";

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

interface SupportRequest {
  addressText?: string | null;
  city?: string | null;
  createdAt: string;
  email: string;
  id: number;
  message: string;
  name: string;
  orderId?: number | null;
  orderNumber?: string | null;
  phone?: string | null;
  requestType: string;
  serviceType?: string | null;
  state?: string | null;
  status: string;
  zip?: string | null;
}

interface AdminOrderSummary {
  address: {
    formattedAddress?: string | null;
  } | null;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  order: {
    createdAt: string;
    id: number;
    scheduledStartAt?: string | null;
    serviceLabel: string;
    status: string;
    statusLabel: string;
    totalPriceCents: number;
  };
}

interface CustomerProfile {
  email: string;
  firstName: string;
  id: number;
  lastName: string;
  phone?: string | null;
}

interface CustomerOrderSummary {
  createdAt: string;
  id: number;
  scheduledEndAt?: string | null;
  scheduledStartAt?: string | null;
  serviceType: string;
  status: string;
  totalPriceCents: number;
}

interface CustomerAddress {
  id: number;
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

const formatDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not scheduled";

const formatStatusLabel = (status: string) => status.replaceAll("_", " ");

const formatServiceLabel = (serviceType: string) => {
  if (serviceType === "lawncare") {
    return "Lawn Care";
  }

  if (serviceType === "laundry") {
    return "Laundry";
  }

  if (serviceType === "window_washing") {
    return "Window Washing";
  }

  return serviceType.replaceAll("_", " ");
};

const getNextOrder = (orders: CustomerOrderSummary[]) =>
  orders.find((order) =>
    [
      "pending_payment",
      "paid",
      "dispatching",
      "assigned",
      "en_route",
      "arrived",
      "in_progress",
    ].includes(order.status)
  ) ??
  orders[0] ??
  null;

// eslint-disable-next-line complexity -- Dashboard view coordinates several small customer account states.
const CustomerDashboard = ({ userEmail }: { userEmail: string }) => {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      const [ordersResponse, profileResponse, addressesResponse] =
        await Promise.all([
          fetch(new URL("/api/v1/orders", getServerUrl()), {
            credentials: "include",
          }),
          fetch(new URL("/api/v1/me/profile", getServerUrl()), {
            credentials: "include",
          }),
          fetch(new URL("/api/v1/addresses", getServerUrl()), {
            credentials: "include",
          }),
        ]);

      if (!active) {
        return;
      }

      if (ordersResponse.ok) {
        const payload = (await ordersResponse.json()) as {
          orders?: CustomerOrderSummary[];
        };
        setOrders(payload.orders ?? []);
      }

      if (profileResponse.ok) {
        const payload = (await profileResponse.json()) as {
          customer?: CustomerProfile;
        };
        setProfile(payload.customer ?? null);
      }

      if (addressesResponse.ok) {
        const payload = (await addressesResponse.json()) as {
          addresses?: CustomerAddress[];
        };
        setAddresses(payload.addresses ?? []);
      }

      setIsLoading(false);
    };

    const runLoadDashboard = async () => {
      try {
        await loadDashboard();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Dashboard load failed"
        );
        setIsLoading(false);
      }
    };

    void runLoadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const nextOrder = getNextOrder(orders);
  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    userEmail;
  const activeOrderCount = orders.filter((order) =>
    [
      "pending_payment",
      "paid",
      "dispatching",
      "assigned",
      "en_route",
      "arrived",
      "in_progress",
    ].includes(order.status)
  ).length;
  const lifetimeTotalCents = orders.reduce(
    (total, order) => total + order.totalPriceCents,
    0
  );
  const completedOrderCount = orders.filter(
    (order) => order.status === "completed"
  ).length;
  const needsOnboarding = !profile?.phone || addresses.length === 0;

  return (
    <main className="px-4 py-6 text-slate-950 sm:py-10">
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
              <UserRound className="size-4" />
              Customer dashboard
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              Welcome back{displayName ? `, ${displayName}` : ""}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Track upcoming visits, review service totals, and check the latest
              status from your CastleCare crew.
            </p>
          </div>
          <Link to="/dashboard/orders/new">
            <Button
              className="h-11 rounded-full bg-lime-300 px-5 font-bold text-slate-950 hover:bg-lime-200"
              type="button"
            >
              Book service
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              href: "/dashboard/orders",
              icon: ReceiptText,
              label: "Active visits",
              value: isLoading ? "..." : String(activeOrderCount),
            },
            {
              href: "/dashboard/orders",
              icon: CalendarDays,
              label: "Completed",
              value: isLoading ? "..." : String(completedOrderCount),
            },
            {
              href: "/dashboard/orders",
              icon: MapPin,
              label: "Service total",
              value: isLoading ? "..." : formatCents(lifetimeTotalCents),
            },
          ].map(({ href, icon: Icon, label, value }) => (
            <Link
              className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm transition-colors hover:border-lime-300"
              key={label}
              to={href}
            >
              <div className="flex items-center justify-between gap-3">
                <Icon className="size-5 text-lime-600" />
                <ArrowRight className="size-4 text-slate-400" />
              </div>
              <p className="mt-6 text-sm font-bold text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </Link>
          ))}
        </section>

        {needsOnboarding && !isLoading ? (
          <section className="rounded-3xl border border-lime-300 bg-lime-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black">
                  Finish your customer setup
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Add your phone and at least one service address so
                  authenticated booking can start from saved details.
                </p>
              </div>
              <Link to="/dashboard/settings">
                <Button
                  className="rounded-full bg-lime-300 font-bold text-slate-950 hover:bg-lime-200"
                  type="button"
                >
                  Open settings
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-5 text-lime-600" />
              <h2 className="font-black text-slate-950">Next service</h2>
            </div>
            {nextOrder ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-black uppercase text-lime-700">
                    {formatServiceLabel(nextOrder.serviceType)}
                  </p>
                  <h3 className="mt-1 text-2xl font-black">
                    Order #{nextOrder.id}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {formatDateTime(nextOrder.scheduledStartAt)}
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
                    {formatStatusLabel(nextOrder.status)}
                  </span>
                </div>
                <div className="grid content-between gap-4 sm:text-right">
                  <p className="text-2xl font-black text-lime-700">
                    {formatCents(nextOrder.totalPriceCents)}
                  </p>
                  <Link
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    params={{ orderId: String(nextOrder.id) }}
                    to="/dashboard/orders/$orderId"
                  >
                    Details
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">
                No bookings yet. Start with lawn care, laundry, or window
                washing whenever you are ready.
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ReceiptText className="size-5 text-lime-600" />
              <h2 className="font-black text-slate-950">Account</h2>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-black">{displayName || "CastleCare"}</p>
                <p className="mt-1 text-slate-600">
                  {profile?.email ?? userEmail}
                </p>
                {profile?.phone ? (
                  <p className="mt-1 text-slate-600">{profile.phone}</p>
                ) : null}
              </div>
              <div className="rounded-2xl bg-lime-50 p-4">
                <p className="font-black text-slate-950">Saved details</p>
                <p className="mt-1 leading-6 text-slate-600">
                  Your future bookings can reuse this contact profile and
                  {addresses.length > 0
                    ? ` ${addresses.length} saved address${addresses.length === 1 ? "" : "es"}.`
                    : " saved addresses once you add them."}
                </p>
                <Link
                  className="mt-3 inline-flex text-sm font-black text-lime-700"
                  to="/dashboard/settings"
                >
                  Manage settings
                </Link>
              </div>
            </div>
          </article>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="size-5 text-lime-600" />
                <h2 className="text-2xl font-black">Service history</h2>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Your most recent CastleCare bookings and status updates.
              </p>
            </div>
            <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
              {orders.length} orders
            </div>
          </div>

          <div className="grid gap-3">
            {isLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
                Loading dashboard...
              </div>
            ) : null}
            {!isLoading && orders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <h3 className="text-xl font-black text-slate-950">
                  No service history yet
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Book your first CastleCare visit and the schedule, status, and
                  receipts will show up here.
                </p>
                <Link to="/dashboard/orders/new">
                  <Button
                    className="mt-5 rounded-full bg-lime-300 font-bold text-slate-950 hover:bg-lime-200"
                    type="button"
                  >
                    Book service
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            ) : null}
            {orders.map((order) => (
              <Link
                className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm transition-colors hover:border-lime-300 sm:grid-cols-[1fr_auto]"
                key={order.id}
                params={{ orderId: String(order.id) }}
                to="/dashboard/orders/$orderId"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                      {formatServiceLabel(order.serviceType)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                      {formatStatusLabel(order.status)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-black">Order #{order.id}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Created {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="grid content-between gap-3 text-sm font-semibold text-slate-600 sm:text-right">
                  <p>{formatDateTime(order.scheduledStartAt)}</p>
                  <p className="text-lg font-black text-lime-700">
                    {formatCents(order.totalPriceCents)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export const AdminDashboard = ({ userEmail }: { userEmail: string }) => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncLabel, setLastSyncLabel] = useState<string | null>(null);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      setIsLoading(true);
      const [catalogResponse, supportResponse, ordersResponse] =
        await Promise.all([
          apiClient.admin.stripe.catalog.$get(),
          apiClient.admin.support.$get(),
          fetch(new URL("/api/v1/admin/orders", getServerUrl()), {
            credentials: "include",
          }),
        ]);

      if (!catalogResponse.ok) {
        setIsLoading(false);
        return;
      }

      const payload = await catalogResponse.json();
      if (!active) {
        return;
      }

      if (supportResponse.ok) {
        const supportPayload = await supportResponse.json();
        setSupportRequests(supportPayload.requests as SupportRequest[]);
      }

      if (ordersResponse.ok) {
        const ordersPayload = (await ordersResponse.json()) as {
          orders?: AdminOrderSummary[];
        };
        setOrders(ordersPayload.orders ?? []);
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
  const catalogGroups = groupCatalogItems(items);

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
    <main className="px-4 py-6 text-slate-950 sm:py-10">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-lime-500" />
                <h2 className="text-2xl font-black">Operations queue</h2>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Confirm jobs, manage field status, add private notes, and upload
                before or after photos from mobile.
              </p>
            </div>
            <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
              {orders.length} latest
            </div>
          </div>
          <div className="grid gap-3">
            {orders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                No orders yet.
              </div>
            ) : (
              orders.map(({ address, customer, order }) => (
                <Link
                  className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm transition-colors hover:border-lime-300 sm:grid-cols-[1fr_auto]"
                  key={order.id}
                  params={{ orderId: String(order.id) }}
                  to="/admin/orders/$orderId"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                        {order.serviceLabel}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {order.statusLabel}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-black">
                      Order #{order.id}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {customer
                        ? `${customer.firstName} ${customer.lastName} · ${customer.email}`
                        : "Customer"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {address?.formattedAddress ?? "No address"}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-slate-600 sm:text-right">
                    <p>{formatDateTime(order.scheduledStartAt)}</p>
                    <p className="mt-2 text-lg font-black text-lime-700">
                      {formatCents(order.totalPriceCents)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Inbox className="size-5 text-lime-500" />
                <h2 className="text-2xl font-black">Support queue</h2>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Help Center and service-area requests from public pages and
                customer dashboards.
              </p>
            </div>
            <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
              {supportRequests.length} latest
            </div>
          </div>
          <div className="grid gap-4">
            {supportRequests.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                No support requests yet.
              </div>
            ) : (
              supportRequests.map((request) => (
                <article
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={request.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                          {request.requestType.replace("_", " ")}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {request.status}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-black">
                        {request.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {request.email}
                        {request.phone ? ` · ${request.phone}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-700">
                    {request.message}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                    {request.orderId ? (
                      <span>Order #{request.orderId}</span>
                    ) : null}
                    {request.orderNumber ? (
                      <span>Ref {request.orderNumber}</span>
                    ) : null}
                    {request.serviceType ? (
                      <span>{request.serviceType.replace("_", " ")}</span>
                    ) : null}
                    {request.addressText ? (
                      <span>
                        {[
                          request.addressText,
                          request.city,
                          request.state,
                          request.zip,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-lime-500" />
            <h2 className="text-2xl font-black">Products and prices</h2>
          </div>
          <div className="grid gap-4">
            {catalogGroups.map(([groupKey, group]) => (
              <div
                className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                key={groupKey}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-black text-slate-950">{group.name}</h3>
                    <p className="mt-1 text-xs font-semibold uppercase text-slate-500">
                      {group.serviceType.replace("_", " ")} product ·{" "}
                      {group.items.length} price
                      {group.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {groupKey}
                  </p>
                </div>
                <div className="grid gap-3">
                  {group.items.map(({ item, originalIndex }) => (
                    <div
                      className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 lg:grid-cols-[1.1fr_0.7fr_0.4fr_0.5fr_0.4fr]"
                      key={item.slug}
                    >
                      <div className="flex flex-col gap-2">
                        <Label>Name</Label>
                        <Input
                          className="rounded-2xl"
                          onChange={(event) =>
                            updateItem(originalIndex, {
                              name: event.target.value,
                            })
                          }
                          value={item.name}
                        />
                        <Input
                          className="rounded-2xl"
                          onChange={(event) =>
                            updateItem(originalIndex, {
                              description: event.target.value,
                            })
                          }
                          value={item.description}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>Slug</Label>
                        <Input
                          className="rounded-2xl"
                          onChange={(event) =>
                            updateItem(originalIndex, {
                              slug: event.target.value,
                            })
                          }
                          value={item.slug}
                        />
                        <p className="text-xs text-slate-500">
                          {item.stripeProductId ?? "No Stripe product yet"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>Price</Label>
                        <Input
                          className="rounded-2xl"
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
                      <div className="flex flex-col gap-2">
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
                        <p className="text-xs text-slate-500">
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

const RouteComponent = () => {
  const { session } = useRouteContext({ from: "/_auth/dashboard" });
  return <CustomerDashboard userEmail={session.data?.user.email ?? ""} />;
};

export const Route = createFileRoute("/_auth/dashboard/")({
  component: RouteComponent,
});
