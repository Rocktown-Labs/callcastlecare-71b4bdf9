import { Badge } from "@callcastlecare/ui/components/badge";
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
  MapPin,
  ReceiptText,
  Send,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { DispatchWorker } from "@/components/admin/dispatch-helpers";
import { isScheduledToday } from "@/components/admin/dispatch-helpers";
import { DispatchModal } from "@/components/admin/dispatch-modal";
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
    assignedWorkerId?: number | null;
    createdAt: string;
    groupStatus?: string;
    groupStatusLabel?: string;
    id: number;
    orderIds: number[];
    scheduledStartAt?: string | null;
    serviceCount?: number;
    serviceLabel?: string;
    serviceLabels?: string[];
    status: string;
    statusLabel?: string;
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

const getOrderServiceLabels = (order: AdminOrderSummary["order"]) => {
  if (Array.isArray(order.serviceLabels)) {
    return order.serviceLabels;
  }
  return order.serviceLabel ? [order.serviceLabel] : [];
};

const getStatusTone = (status: string) => {
  if (status === "in_progress" || status === "arrived") {
    return "bg-lime-100 text-lime-800";
  }
  if (status === "assigned" || status === "en_route") {
    return "bg-sky-100 text-sky-800";
  }
  return "bg-slate-100 text-slate-700";
};

const AdminOrdersRoute = () => {
  const { session } = useRouteContext({ from: "/admin_/orders" });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [workers, setWorkers] = useState<DispatchWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dispatchTicket, setDispatchTicket] =
    useState<AdminOrderSummary | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        new URL("/api/v1/admin/orders", getServerUrl()),
        { credentials: "include" }
      );
      if (response.ok) {
        const payload = (await response.json()) as {
          orders?: AdminOrderSummary[];
        };
        setOrders(payload.orders ?? []);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Orders failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pathname !== "/admin/orders") {
      return;
    }

    const timeoutId = window.setTimeout(() => void loadOrders(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadOrders, pathname]);

  useEffect(() => {
    if (pathname !== "/admin/orders") {
      return;
    }

    let active = true;
    const loadWorkers = async () => {
      try {
        const response = await fetch(
          new URL("/api/v1/admin/workers", getServerUrl()),
          { credentials: "include" }
        );
        if (active && response.ok) {
          const payload = (await response.json()) as {
            workers?: DispatchWorker[];
          };
          setWorkers(payload.workers ?? []);
        }
      } catch {
        // Dispatch selects simply stay empty; the queue still works.
      }
    };

    void loadWorkers();
    return () => {
      active = false;
    };
  }, [pathname]);

  if (pathname !== "/admin/orders") {
    return <Outlet />;
  }

  const todaysTickets = orders.filter((ticket) =>
    isScheduledToday(ticket.order.scheduledStartAt)
  );

  return (
    <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
      <main className="px-4 py-6 text-slate-950 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6">
          <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                <ReceiptText className="size-4" />
                Admin operations
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Job queue
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                One ticket per booking window. Expand a ticket to see every
                service, worker offer, field photo, route stop, and timestamp.
              </p>
            </div>
            <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
              {orders.length} open {orders.length === 1 ? "ticket" : "tickets"}
            </div>
          </section>

          <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-lime-700">
                  <UsersRound className="size-4" /> Dispatch desk
                </p>
                <h2 className="mt-1 text-xl font-black">
                  Today tickets · send work to the crew
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  Dispatch the whole ticket to one worker or split services
                  across the crew. Workers get the offer ondemand and accept or
                  decline.
                </p>
              </div>
              <span className="rounded-full bg-lime-100 px-4 py-2 text-sm font-black text-lime-800">
                {todaysTickets.length} today
              </span>
            </div>
            {todaysTickets.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">
                {isLoading
                  ? "Loading today's tickets..."
                  : "Nothing scheduled for today. New bookings land here."}
              </p>
            ) : (
              <div className="grid gap-2">
                {todaysTickets.map((ticket) => (
                  <div
                    className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                    key={ticket.order.id}
                  >
                    <div className="min-w-0">
                      <p className="font-black">
                        Order #{ticket.order.id} ·{" "}
                        {ticket.customer
                          ? `${ticket.customer.firstName} ${ticket.customer.lastName}`
                          : "Customer"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {formatDateTime(ticket.order.scheduledStartAt)} ·{" "}
                        {getOrderServiceLabels(ticket.order).join(" · ") ||
                          "Service"}{" "}
                        ·{" "}
                        {ticket.order.groupStatusLabel ??
                          ticket.order.statusLabel ??
                          ticket.order.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Button
                        className="h-10 rounded-xl bg-lime-300 px-4 text-sm font-black text-slate-950 hover:bg-lime-200"
                        onClick={() => setDispatchTicket(ticket)}
                        type="button"
                      >
                        <Send className="size-4" /> Dispatch
                      </Button>
                      <Link
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:border-slate-400"
                        params={{ orderId: String(ticket.order.id) }}
                        to="/admin/orders/$orderId"
                      >
                        Open ticket <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-4">
            {isLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
                Loading tickets...
              </div>
            ) : null}
            {!isLoading && orders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <ClipboardCheck className="mx-auto size-8 text-lime-600" />
                <h2 className="mt-3 text-xl font-black">No open tickets</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Paid bookings will land here as one cohesive ticket, even when
                  the work is split between several workers.
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
            {orders.map(({ address, customer, order }) => {
              const labels = getOrderServiceLabels(order);
              const status = order.groupStatus ?? order.status;
              return (
                <Link
                  className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-5 text-slate-950 shadow-sm transition-all hover:-translate-y-0.5 hover:border-lime-400 hover:shadow-md lg:grid-cols-[1fr_auto]"
                  key={order.id}
                  params={{ orderId: String(order.id) }}
                  to="/admin/orders/$orderId"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                        {order.serviceLabel ??
                          (labels.join(" · ") || "Service")}
                      </span>
                      <Badge className={getStatusTone(status)}>
                        {order.groupStatusLabel ?? order.statusLabel ?? status}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                        <ShieldCheck className="size-3.5" /> Ticket
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-black">
                      Order #{order.id}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      {customer
                        ? `${customer.firstName} ${customer.lastName} · ${customer.email}`
                        : "Customer"}
                    </p>
                    <p className="mt-1 flex items-start gap-2 text-sm text-slate-500">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-lime-600" />
                      <span>{address?.formattedAddress ?? "No address"}</span>
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {labels.map((label) => (
                        <span
                          className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700"
                          key={label}
                        >
                          {label}
                        </span>
                      ))}
                      <span className="rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-bold text-white">
                        {order.serviceCount ?? labels.length} services
                      </span>
                    </div>
                  </div>
                  <div className="grid content-between gap-4 text-sm font-semibold text-slate-600 lg:min-w-52 lg:text-right">
                    <p className="inline-flex items-center gap-2 lg:justify-end">
                      <CalendarDays className="size-4 text-lime-600" />
                      {formatDateTime(order.scheduledStartAt)}
                    </p>
                    <div>
                      <p className="text-2xl font-black text-lime-700">
                        {formatCents(order.totalPriceCents)}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-2 text-slate-950">
                        Open ticket
                        <ArrowRight className="size-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        </div>
      </main>
      {dispatchTicket ? (
        <DispatchModal
          onClose={() => setDispatchTicket(null)}
          onDispatched={() => void loadOrders()}
          orderId={dispatchTicket.order.id}
          workers={workers}
        />
      ) : null}
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
      throw redirect({ to: "/dashboard" });
    }

    return { session: adminSession };
  },
  component: AdminOrdersRoute,
  ssr: false,
});
