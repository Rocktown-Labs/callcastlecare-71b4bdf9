import { Button } from "@callcastlecare/ui/components/button";
import {
  Link,
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Headphones,
  ReceiptText,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/dashboard/app-shell";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";

interface SessionPayload {
  isAdmin?: boolean;
  user?: {
    email?: string;
  };
}

interface AdminOrderSummary {
  order: {
    id: number;
    scheduledStartAt?: string | null;
    status: string;
    totalPriceCents: number;
  };
}

interface SupportRequest {
  id: number;
  status: string;
}

const activeOrderStatuses = new Set([
  "pending_payment",
  "paid",
  "dispatching",
  "assigned",
  "en_route",
  "arrived",
  "in_progress",
]);

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

const AdminOverview = () => {
  const { session } = useRouteContext({ from: "/admin" });
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [catalogCount, setCatalogCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadOverview = async () => {
      setIsLoading(true);
      const [ordersResponse, supportResponse, catalogResponse] =
        await Promise.all([
          fetch(new URL("/api/v1/admin/orders", getServerUrl()), {
            credentials: "include",
          }),
          fetch(new URL("/api/v1/admin/support", getServerUrl()), {
            credentials: "include",
          }),
          fetch(new URL("/api/v1/admin/stripe/catalog", getServerUrl()), {
            credentials: "include",
          }),
        ]);

      if (!active) {
        return;
      }

      if (ordersResponse.ok) {
        const payload = (await ordersResponse.json()) as {
          orders?: AdminOrderSummary[];
        };
        setOrders(payload.orders ?? []);
      }

      if (supportResponse.ok) {
        const payload = (await supportResponse.json()) as {
          requests?: SupportRequest[];
        };
        setSupportRequests(payload.requests ?? []);
      }

      if (catalogResponse.ok) {
        const payload = (await catalogResponse.json()) as {
          items?: unknown[];
        };
        setCatalogCount(payload.items?.length ?? 0);
      }

      setIsLoading(false);
    };

    const runLoadOverview = async () => {
      try {
        await loadOverview();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Admin load failed"
        );
        setIsLoading(false);
      }
    };

    void runLoadOverview();

    return () => {
      active = false;
    };
  }, []);

  const activeOrders = orders.filter(({ order }) =>
    activeOrderStatuses.has(order.status)
  );
  const revenueCents = orders.reduce(
    (total, { order }) => total + order.totalPriceCents,
    0
  );
  const openSupportCount = supportRequests.filter(
    (request) => request.status !== "closed"
  ).length;

  return (
    <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
      <main className="px-4 py-6 text-slate-950 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6">
          <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                <CalendarDays className="size-4" />
                Admin overview
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Operations board
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Watch the work queue, jump into field actions, and keep the
                launch catalog and support queue moving.
              </p>
            </div>
            <Link to="/admin/orders">
              <Button
                className="h-11 rounded-full bg-lime-300 px-5 font-bold text-slate-950 hover:bg-lime-200"
                type="button"
              >
                Open orders
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                href: "/admin/orders",
                icon: ReceiptText,
                label: "Active orders",
                value: isLoading ? "..." : String(activeOrders.length),
              },
              {
                href: "/admin/orders",
                icon: CalendarDays,
                label: "Total booked",
                value: isLoading ? "..." : String(orders.length),
              },
              {
                href: "/admin/support",
                icon: Headphones,
                label: "Open support",
                value: isLoading ? "..." : String(openSupportCount),
              },
              {
                href: "/admin/catalog",
                icon: ShoppingBag,
                label: "Catalog rows",
                value: isLoading ? "..." : String(catalogCount),
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

          <section className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">Field queue</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Orders open into the same action screen staff can use in the
                    field.
                  </p>
                </div>
                <Link
                  className="text-sm font-black text-lime-700"
                  to="/admin/orders"
                >
                  View all
                </Link>
              </div>
              <div className="mt-5 grid gap-3">
                {activeOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                    No active orders yet. New paid or dispatching orders will
                    appear here with action buttons.
                  </div>
                ) : (
                  activeOrders.slice(0, 5).map(({ order }) => (
                    <Link
                      className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 text-sm"
                      key={order.id}
                      params={{ orderId: String(order.id) }}
                      to="/admin/orders/$orderId"
                    >
                      <span className="font-black">Order #{order.id}</span>
                      <span className="font-semibold capitalize text-slate-600">
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <UsersRound className="size-5 text-lime-600" />
                <h2 className="text-xl font-black">Staff view</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Staff tools start with the same order action screen: confirm,
                arrive, upload before photos, start, upload after photos, and
                complete.
              </p>
              <p className="mt-5 text-2xl font-black">
                {formatCents(revenueCents)}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Booked order total in this admin view
              </p>
              <Link to="/admin/staff">
                <Button
                  className="mt-5 h-10 rounded-full border-slate-200"
                  type="button"
                  variant="outline"
                >
                  Staff routes
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </article>
          </section>
        </div>
      </main>
    </AppShell>
  );
};

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        search: { redirectTo: "/admin" },
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
  component: AdminOverview,
  ssr: false,
});
