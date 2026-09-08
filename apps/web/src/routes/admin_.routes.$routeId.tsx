import { Badge } from "@callcastlecare/ui/components/badge";
import { Button } from "@callcastlecare/ui/components/button";
import {
  Link,
  createFileRoute,
  redirect,
  useParams,
  useRouteContext,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { AdminRouteDetail } from "@/components/admin/route-display";
import {
  formatRouteDate,
  formatRouteServiceLabel,
  getRouteStatusTone,
  routeLifecycleStatuses,
} from "@/components/admin/route-display";
import {
  formatMiles,
  getAppleDirectionsUrl,
  getGoogleDirectionsUrl,
  getGoogleSearchUrl,
  getRouteLegMiles,
} from "@/components/admin/route-links";
import { AppShell } from "@/components/dashboard/app-shell";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";

interface SessionPayload {
  isAdmin?: boolean;
  user?: { email?: string };
}

interface TicketGroup {
  address: { formattedAddress?: string | null } | null;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  order: {
    id: number;
    orderIds: number[];
    scheduledStartAt?: string | null;
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

const RouteDetailPage = () => {
  const { session } = useRouteContext({ from: "/admin_/routes/$routeId" });
  const { routeId } = useParams({ from: "/admin_/routes/$routeId" });
  const [detail, setDetail] = useState<AdminRouteDetail | null>(null);
  const [tickets, setTickets] = useState<TicketGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [addOrderId, setAddOrderId] = useState("");

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const [detailResponse, ticketsResponse] = await Promise.all([
        fetch(new URL(`/api/v1/admin/routes/${routeId}`, getServerUrl()), {
          credentials: "include",
        }),
        fetch(new URL("/api/v1/admin/orders", getServerUrl()), {
          credentials: "include",
        }),
      ]);
      if (!detailResponse.ok) {
        toast.error("Route could not be loaded");
        return;
      }
      setDetail((await detailResponse.json()) as AdminRouteDetail);
      if (ticketsResponse.ok) {
        const payload = (await ticketsResponse.json()) as {
          orders?: TicketGroup[];
        };
        setTickets(payload.orders ?? []);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Load failed");
    } finally {
      setIsLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadDetail(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDetail]);

  const updateStatus = async (status: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(
        new URL(`/api/v1/admin/routes/${routeId}`, getServerUrl()),
        {
          body: JSON.stringify({ status }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        }
      );
      if (!response.ok) {
        toast.error("Route status could not be saved");
        return;
      }
      toast.success(`Route ${status.replaceAll("_", " ")}`);
      await loadDetail();
    } finally {
      setIsSaving(false);
    }
  };

  const addStop = async () => {
    if (!addOrderId) {
      toast.error("Choose a ticket first");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(
        new URL(`/api/v1/admin/routes/${routeId}/stops`, getServerUrl()),
        {
          body: JSON.stringify({ orderId: Number(addOrderId) }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(payload?.error ?? "Stop could not be added");
        return;
      }
      setAddOrderId("");
      toast.success("Stop added");
      await loadDetail();
    } finally {
      setIsSaving(false);
    }
  };

  const removeStop = async (stopId: number) => {
    const response = await fetch(
      new URL(
        `/api/v1/admin/routes/${routeId}/stops/${stopId}`,
        getServerUrl()
      ),
      { credentials: "include", method: "DELETE" }
    );
    if (!response.ok) {
      toast.error("Stop could not be removed");
      return;
    }
    toast.success("Stop removed");
    await loadDetail();
  };

  if (isLoading || !detail) {
    return (
      <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
        <main className="px-4 py-8">
          <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold">
            Loading route #{routeId}...
          </div>
        </main>
      </AppShell>
    );
  }

  const { route, stops, worker } = detail;
  const stopOrderIds = new Set(stops.map((stop) => stop.orderId));
  const addableTickets = tickets.flatMap((ticket) =>
    (ticket.order.orderIds ?? [ticket.order.id])
      .filter((orderId) => !stopOrderIds.has(orderId))
      .map((orderId) => ({
        customer: ticket.customer
          ? `${ticket.customer.firstName} ${ticket.customer.lastName}`
          : "Customer",
        id: orderId,
      }))
  );
  const legMiles = getRouteLegMiles(stops);
  const totalMiles = legMiles.reduce<number>(
    (total, miles) => total + (miles ?? 0),
    0
  );
  const fullRouteUrl = getGoogleDirectionsUrl(stops);

  return (
    <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
      <main className="px-4 py-5 text-slate-950 sm:py-8">
        <div className="mx-auto grid max-w-4xl gap-5">
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"
            to="/admin/routes"
          >
            <ArrowLeft className="size-4" /> Routes
          </Link>

          <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                    Route #{route.id}
                  </span>
                  <Badge className={getRouteStatusTone(route.status)}>
                    {route.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight">
                  {route.name}
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {worker
                    ? `${worker.firstName} ${worker.lastName}`
                    : `Worker #${route.workerId}`}{" "}
                  · {formatRouteDate(route.routeDate)} · {stops.length} stop
                  {stops.length === 1 ? "" : "s"}
                  {totalMiles > 0 ? ` · ≈${formatMiles(totalMiles)} apart` : ""}
                </p>
              </div>
              {fullRouteUrl ? (
                <a
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-lime-300 px-5 text-sm font-bold text-slate-950 hover:bg-lime-200"
                  href={fullRouteUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Navigation className="size-4" /> Open full route
                </a>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {routeLifecycleStatuses.map((status) => (
                <Button
                  className={
                    route.status === status
                      ? "rounded-full bg-slate-950 text-white"
                      : "rounded-full"
                  }
                  disabled={isSaving || route.status === status}
                  key={status}
                  onClick={() => void updateStatus(status)}
                  size="sm"
                  type="button"
                  variant={route.status === status ? "default" : "outline"}
                >
                  {status.replaceAll("_", " ")}
                </Button>
              ))}
            </div>
          </section>

          <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <MapPin className="size-5 text-lime-600" /> Stops in order
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Ticket to add"
                  className="h-10 min-w-52 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
                  onChange={(event) => setAddOrderId(event.target.value)}
                  value={addOrderId}
                >
                  <option value="">Add a ticket...</option>
                  {addableTickets.map((ticket) => (
                    <option key={ticket.id} value={ticket.id}>
                      Order #{ticket.id} · {ticket.customer}
                    </option>
                  ))}
                </select>
                <Button
                  className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={isSaving || !addOrderId}
                  onClick={addStop}
                  type="button"
                >
                  <Plus className="size-4" /> Add
                </Button>
              </div>
            </div>

            {stops.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">
                No stops yet — add the first ticket above.
              </p>
            ) : (
              <div className="grid gap-2">
                {stops.map((stop, index) => {
                  const miles = legMiles[index];
                  const googleUrl = getGoogleSearchUrl(stop.address);
                  const appleUrl = getAppleDirectionsUrl(stop.address);
                  return (
                    <article
                      className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                      key={stop.id}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-black">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs text-white">
                            {stop.sequence}
                          </span>
                          <Link
                            className="truncate hover:text-lime-700 hover:underline"
                            params={{ orderId: String(stop.orderId) }}
                            to="/admin/orders/$orderId"
                          >
                            Order #{stop.orderId}
                            {stop.order?.serviceType
                              ? ` · ${formatRouteServiceLabel(stop.order.serviceType)}`
                              : ""}
                          </Link>
                          {miles !== null && miles !== undefined ? (
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                              +{formatMiles(miles)}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-600">
                          {stop.customer
                            ? `${stop.customer.firstName ?? ""} ${stop.customer.lastName ?? ""}`.trim() ||
                              stop.customer.email ||
                              "Customer"
                            : "Customer"}{" "}
                          ·{" "}
                          {stop.address?.formattedAddress ??
                            "No address recorded"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {googleUrl ? (
                          <a
                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-lime-300"
                            href={googleUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Google <ExternalLink className="size-3" />
                          </a>
                        ) : null}
                        {appleUrl ? (
                          <a
                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-lime-300"
                            href={appleUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Apple <ExternalLink className="size-3" />
                          </a>
                        ) : null}
                        <Button
                          aria-label={`Remove stop ${stop.sequence}`}
                          className="size-9 rounded-full border-rose-200 bg-rose-50 p-0 text-rose-700 hover:bg-rose-100"
                          onClick={() => void removeStop(stop.id)}
                          type="button"
                          variant="outline"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <Button
            className="rounded-full"
            onClick={() => void loadDetail()}
            type="button"
            variant="outline"
          >
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      </main>
    </AppShell>
  );
};

export const Route = createFileRoute("/admin_/routes/$routeId")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        search: { redirectTo: "/admin/routes" },
        to: "/sign-in",
      });
    }
    const adminSession = await getAdminSession();
    if (!adminSession?.isAdmin) {
      throw redirect({ to: "/dashboard" });
    }
    return { session: adminSession };
  },
  component: RouteDetailPage,
  ssr: false,
});
