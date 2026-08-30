import { Button } from "@callcastlecare/ui/components/button";
import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useRouteContext,
  useRouterState,
} from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  ReceiptText,
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

const formatDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not scheduled";

const AdminOrdersRoute = () => {
  const { session } = useRouteContext({ from: "/admin_/orders" });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (pathname !== "/admin/orders") {
      return;
    }

    let active = true;

    const loadOrders = async () => {
      setIsLoading(true);
      const response = await fetch(
        new URL("/api/v1/admin/orders", getServerUrl()),
        {
          credentials: "include",
        }
      );

      if (!active) {
        return;
      }

      if (response.ok) {
        const payload = (await response.json()) as {
          orders?: AdminOrderSummary[];
        };
        setOrders(payload.orders ?? []);
      }

      setIsLoading(false);
    };

    const runLoadOrders = async () => {
      try {
        await loadOrders();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Orders failed");
        setIsLoading(false);
      }
    };

    void runLoadOrders();

    return () => {
      active = false;
    };
  }, [pathname]);

  if (pathname !== "/admin/orders") {
    return <Outlet />;
  }

  return (
    <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
      <main className="px-4 py-6 text-slate-950 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6">
          <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                <ReceiptText className="size-4" />
                Admin orders
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Job queue
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Open an order to confirm it, move it through field statuses, add
                notes, and upload before or after photos.
              </p>
            </div>
            <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
              {orders.length} orders
            </div>
          </section>

          <section className="grid gap-3">
            {isLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
                Loading orders...
              </div>
            ) : null}
            {!isLoading && orders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <ClipboardCheck className="mx-auto size-8 text-lime-600" />
                <h2 className="mt-3 text-xl font-black">No jobs yet</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Paid bookings will land here with the field action workflow
                  ready to use.
                </p>
                <Link to="/admin/catalog">
                  <Button
                    className="mt-5 rounded-full bg-lime-300 font-bold text-slate-950 hover:bg-lime-200"
                    type="button"
                  >
                    Check catalog
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            ) : null}
            {orders.map(({ address, customer, order }) => (
              <Link
                className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm transition-colors hover:border-lime-300 lg:grid-cols-[1fr_auto]"
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
                  <h2 className="mt-3 text-lg font-black">Order #{order.id}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {customer
                      ? `${customer.firstName} ${customer.lastName} · ${customer.email}`
                      : "Customer"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {address?.formattedAddress ?? "No address"}
                  </p>
                </div>
                <div className="grid gap-2 text-sm font-semibold text-slate-600 lg:text-right">
                  <p className="inline-flex items-center gap-2 lg:justify-end">
                    <CalendarDays className="size-4 text-lime-600" />
                    {formatDateTime(order.scheduledStartAt)}
                  </p>
                  <p className="text-lg font-black text-lime-700">
                    {formatCents(order.totalPriceCents)}
                  </p>
                  <span className="inline-flex items-center gap-2 text-slate-950 lg:justify-end">
                    Field actions
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </AppShell>
  );
};

export const Route = createFileRoute("/admin_/orders")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        search: { redirectTo: "/admin/orders" },
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
  component: AdminOrdersRoute,
  ssr: false,
});
