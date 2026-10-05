import { Badge } from "@callcastlecare/ui/components/badge";
import { Button } from "@callcastlecare/ui/components/button";
import { Input } from "@callcastlecare/ui/components/input";
import { Label } from "@callcastlecare/ui/components/label";
import { useForm } from "@tanstack/react-form";
import {
  createFileRoute,
  Link,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowRight,
  ArrowUpDown,
  Inbox,
  MapPin,
  Plus,
  Route as RouteIcon,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import type { DispatchWorker } from "@/components/admin/dispatch-helpers";
import {
  getTodayInputValue,
  getRouteStatusTone,
} from "@/components/admin/route-display";
import type {
  AdminRouteDetail,
  AdminRouteRow,
} from "@/components/admin/route-display";
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
    serviceLabels?: string[];
    status: string;
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

const routeBuilderSchema = z.object({
  name: z.string().trim().max(120).optional(),
  routeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Pick a route date"),
  workerId: z.string().min(1, "Choose a worker"),
});

type RouteBuilderValues = z.infer<typeof routeBuilderSchema>;

const columnHelper = createColumnHelper<AdminRouteRow>();

const RouteNameCell = ({ route }: { route: AdminRouteRow }) => (
  <Link
    className="font-black text-slate-950 hover:text-lime-700 hover:underline"
    params={{ routeId: String(route.id) }}
    to="/admin/routes/$routeId"
  >
    {route.name}
    <span className="block text-xs font-semibold text-slate-500">
      Route #{route.id}
    </span>
  </Link>
);

const RouteWorkerCell = ({ route }: { route: AdminRouteRow }) =>
  route.worker ? (
    <span className="font-semibold">
      {route.worker.firstName} {route.worker.lastName}
    </span>
  ) : (
    <span className="text-slate-400">Worker #{route.workerId}</span>
  );

const routeColumns = [
  columnHelper.accessor("routeDate", {
    cell: ({ row }) => (
      <span className="text-xs font-bold text-slate-600">
        {row.original.routeDate}
      </span>
    ),
    header: ({ column }) => (
      <button
        className="inline-flex items-center gap-1 font-black uppercase"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        type="button"
      >
        Date
        <ArrowUpDown className="size-3" />
      </button>
    ),
  }),
  columnHelper.accessor("name", {
    cell: ({ row }) => <RouteNameCell route={row.original} />,
    header: "Route",
    id: "route",
  }),
  columnHelper.accessor("workerId", {
    cell: ({ row }) => <RouteWorkerCell route={row.original} />,
    header: "Worker",
    id: "worker",
  }),
  columnHelper.accessor("status", {
    cell: ({ getValue }) => (
      <Badge className={getRouteStatusTone(getValue())}>
        {getValue().replaceAll("_", " ")}
      </Badge>
    ),
    header: "Status",
  }),
  columnHelper.accessor("stopCount", {
    cell: ({ getValue }) => (
      <span className="font-black">{getValue()} stops</span>
    ),
    header: "Stops",
  }),
  columnHelper.display({
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Link
          className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-lime-300"
          params={{ routeId: String(row.original.id) }}
          to="/admin/routes/$routeId"
        >
          Open <ArrowRight className="size-3" />
        </Link>
      </div>
    ),
    header: () => <span className="float-right">Action</span>,
    id: "actions",
  }),
];

// eslint-disable-next-line react/react-compiler -- TanStack Table and TanStack Form handles return function-laden objects the compiler refuses to memoize; skipping compilation matches the compiler default for this component.
const AdminRoutesPage = () => {
  const { session } = useRouteContext({ from: "/admin_/routes" });
  const [routes, setRoutes] = useState<AdminRouteRow[]>([]);
  const [workers, setWorkers] = useState<DispatchWorker[]>([]);
  const [tickets, setTickets] = useState<TicketGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
  const [activeDetail, setActiveDetail] = useState<AdminRouteDetail | null>(
    null
  );
  const [addOrderId, setAddOrderId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadRoutes = useCallback(async () => {
    const response = await fetch(
      new URL("/api/v1/admin/routes", getServerUrl()),
      {
        credentials: "include",
      }
    );
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { routes?: AdminRouteRow[] };
    setRoutes(payload.routes ?? []);
  }, []);

  const loadWorkersAndTickets = useCallback(async () => {
    try {
      const [workersResponse, ticketsResponse] = await Promise.all([
        fetch(new URL("/api/v1/admin/workers", getServerUrl()), {
          credentials: "include",
        }),
        fetch(new URL("/api/v1/admin/orders", getServerUrl()), {
          credentials: "include",
        }),
      ]);
      if (workersResponse.ok) {
        const payload = (await workersResponse.json()) as {
          workers?: DispatchWorker[];
        };
        setWorkers(payload.workers ?? []);
      }
      if (ticketsResponse.ok) {
        const payload = (await ticketsResponse.json()) as {
          orders?: TicketGroup[];
        };
        setTickets(payload.orders ?? []);
      }
    } catch {
      // Builder selects stay empty; the table still works.
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      await Promise.all([loadRoutes(), loadWorkersAndTickets()]);
      if (active) {
        setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [loadRoutes, loadWorkersAndTickets]);

  const loadRouteDetail = useCallback(async (routeId: number) => {
    const response = await fetch(
      new URL(`/api/v1/admin/routes/${routeId}`, getServerUrl()),
      { credentials: "include" }
    );
    if (!response.ok) {
      toast.error("Route could not be loaded");
      return;
    }
    const payload = (await response.json()) as AdminRouteDetail;
    setActiveRouteId(routeId);
    setActiveDetail(payload);
  }, []);

  const form = useForm({
    defaultValues: {
      name: "",
      routeDate: getTodayInputValue(),
      workerId: "",
    } as RouteBuilderValues,
    onSubmit: async ({ value }) => {
      setIsSaving(true);
      try {
        const response = await fetch(
          new URL("/api/v1/admin/routes", getServerUrl()),
          {
            body: JSON.stringify({
              ...(value.name?.trim() ? { name: value.name.trim() } : {}),
              routeDate: value.routeDate,
              workerId: Number(value.workerId),
            }),
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          toast.error(payload?.error ?? "Route could not be created");
          return;
        }
        const payload = (await response.json()) as {
          route: { id: number };
        };
        toast.success("Route ready — add tickets below");
        await loadRoutes();
        await loadRouteDetail(payload.route.id);
      } finally {
        setIsSaving(false);
      }
    },
    validators: { onSubmit: routeBuilderSchema },
  });

  const checkExistingRoute = async (workerId: string, routeDate: string) => {
    if (!workerId || !routeDate) {
      return;
    }
    const url = new URL("/api/v1/admin/routes", getServerUrl());
    url.searchParams.set("workerId", workerId);
    url.searchParams.set("routeDate", routeDate);
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as {
      route?: { id: number; name: string } | null;
    };
    if (payload.route) {
      toast.info(`${payload.route.name} already covers this day — loaded it`);
      await loadRouteDetail(payload.route.id);
    }
  };

  const addStop = async () => {
    if (!activeRouteId || !addOrderId) {
      toast.error("Choose a ticket first");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(
        new URL(`/api/v1/admin/routes/${activeRouteId}/stops`, getServerUrl()),
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
      toast.success("Ticket added to route");
      await loadRouteDetail(activeRouteId);
      await loadRoutes();
    } finally {
      setIsSaving(false);
    }
  };

  const removeStop = async (stopId: number) => {
    if (!activeRouteId) {
      return;
    }
    const response = await fetch(
      new URL(
        `/api/v1/admin/routes/${activeRouteId}/stops/${stopId}`,
        getServerUrl()
      ),
      { credentials: "include", method: "DELETE" }
    );
    if (!response.ok) {
      toast.error("Stop could not be removed");
      return;
    }
    await loadRouteDetail(activeRouteId);
    await loadRoutes();
  };

  const filteredRoutes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return routes.filter((route) => {
      if (statusFilter !== "all" && route.status !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const workerName = route.worker
        ? `${route.worker.firstName} ${route.worker.lastName}`
        : "";
      return `${route.name} ${workerName} ${route.routeDate}`
        .toLowerCase()
        .includes(query);
    });
  }, [routes, search, statusFilter]);

  const table = useReactTable({
    columns: routeColumns,
    data: filteredRoutes,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageIndex: 0, pageSize: 15 },
      sorting: [{ desc: true, id: "routeDate" }],
    },
  });

  const addableTickets = useMemo(() => {
    const stopOrderIds = new Set(
      (activeDetail?.stops ?? []).map((stop) => stop.orderId)
    );
    return tickets.flatMap((ticket) =>
      (ticket.order.orderIds ?? [ticket.order.id])
        .filter((orderId) => !stopOrderIds.has(orderId))
        .map((orderId) => ({
          customer: ticket.customer
            ? `${ticket.customer.firstName} ${ticket.customer.lastName}`
            : "Customer",
          id: orderId,
          labels: (ticket.order.serviceLabels ?? []).join(" · "),
        }))
    );
  }, [tickets, activeDetail]);

  return (
    <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
      <main className="px-4 py-6 text-slate-950 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6">
          <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                <RouteIcon className="size-4" />
                Routes & dispatch
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Field routes
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                A route is a worker&apos;s day: an ordered set of ticket stops
                to map, drive, and work through. Build one below or open any
                route for directions and stop management.
              </p>
            </div>
            <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
              {routes.length} route{routes.length === 1 ? "" : "s"}
            </div>
          </section>

          <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black">
                <Plus className="size-5 text-lime-600" /> Route builder
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Pick a worker and day — an existing route loads automatically —
                or start a fresh one, then add tickets as stops.
              </p>
            </div>
            <form
              className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <form.Field name="workerId">
                {(field) => (
                  <div className="grid gap-1">
                    <Label htmlFor="route-worker">Worker</Label>
                    <select
                      className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold"
                      id="route-worker"
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        const next = event.target.value;
                        field.handleChange(next);
                        void checkExistingRoute(
                          next,
                          form.state.values.routeDate
                        );
                      }}
                      value={field.state.value}
                    >
                      <option value="">Choose worker</option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.firstName} {worker.lastName}
                          {worker.onboardingStatus === "approved" &&
                          worker.isActive
                            ? ""
                            : " · not active"}
                        </option>
                      ))}
                    </select>
                    {field.state.meta.errors.map((error) => (
                      <p className="text-xs text-rose-600" key={error?.message}>
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>
              <form.Field name="routeDate">
                {(field) => (
                  <div className="grid gap-1">
                    <Label htmlFor="route-date">Route date</Label>
                    <Input
                      className="rounded-2xl"
                      id="route-date"
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        void checkExistingRoute(
                          form.state.values.workerId,
                          event.target.value
                        );
                      }}
                      type="date"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p className="text-xs text-rose-600" key={error?.message}>
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>
              <form.Field name="name">
                {(field) => (
                  <div className="grid gap-1">
                    <Label htmlFor="route-name">Name (optional)</Label>
                    <Input
                      className="rounded-2xl"
                      id="route-name"
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Saturday north loop"
                      value={field.state.value ?? ""}
                    />
                  </div>
                )}
              </form.Field>
              <form.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <Button
                    className="h-10 rounded-2xl bg-slate-950 px-5 font-bold text-white hover:bg-slate-800"
                    disabled={!canSubmit || isSubmitting || isSaving}
                    type="submit"
                  >
                    {isSubmitting || isSaving
                      ? "Saving..."
                      : "Create / load route"}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            {activeDetail ? (
              <div className="grid gap-3 rounded-2xl border border-lime-200 bg-lime-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black">{activeDetail.route.name}</p>
                    <p className="text-sm font-semibold text-slate-600">
                      {activeDetail.worker
                        ? `${activeDetail.worker.firstName} ${activeDetail.worker.lastName} · `
                        : ""}
                      {activeDetail.route.routeDate} ·{" "}
                      {activeDetail.route.status.replaceAll("_", " ")} ·{" "}
                      {activeDetail.stops.length} stops
                    </p>
                  </div>
                  <Link
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-bold text-white hover:bg-slate-800"
                    params={{ routeId: String(activeDetail.route.id) }}
                    to="/admin/routes/$routeId"
                  >
                    Open route <ArrowRight className="size-3.5" />
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Ticket to add"
                    className="h-10 min-w-52 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
                    onChange={(event) => setAddOrderId(event.target.value)}
                    value={addOrderId}
                  >
                    <option value="">Add a ticket...</option>
                    {addableTickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        Order #{ticket.id} · {ticket.customer}
                        {ticket.labels ? ` · ${ticket.labels}` : ""}
                      </option>
                    ))}
                  </select>
                  <Button
                    className="h-10 rounded-xl bg-lime-300 px-4 text-sm font-black text-slate-950 hover:bg-lime-200 disabled:opacity-60"
                    disabled={isSaving || !addOrderId}
                    onClick={addStop}
                    type="button"
                  >
                    <Plus className="size-4" /> Add stop
                  </Button>
                </div>
                {activeDetail.stops.length > 0 ? (
                  <div className="grid gap-2">
                    {activeDetail.stops.map((stop) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"
                        key={stop.id}
                      >
                        <span className="flex min-w-0 items-center gap-2 font-bold">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs text-white">
                            {stop.sequence}
                          </span>
                          <span className="truncate">
                            {stop.address?.formattedAddress ??
                              `Order #${stop.orderId}`}
                          </span>
                        </span>
                        <Button
                          aria-label={`Remove stop ${stop.sequence}`}
                          className="size-8 shrink-0 rounded-lg border-rose-200 bg-rose-50 p-0 text-rose-700 hover:bg-rose-100"
                          onClick={() => void removeStop(stop.id)}
                          type="button"
                          variant="outline"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-600">
                    No stops yet — add tickets from the dropdown above.
                  </p>
                )}
              </div>
            ) : null}
          </section>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  All routes
                </h2>
                <p className="text-xs text-slate-500">
                  Click any route for stops, directions, and status actions.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-end">
                <div className="grid gap-1">
                  <Label>Search</Label>
                  <Input
                    className="w-full rounded-2xl lg:w-56"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Name, worker, date..."
                    value={search}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Status</Label>
                  <select
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm"
                    onChange={(event) => setStatusFilter(event.target.value)}
                    value={statusFilter}
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th className="px-4 py-3" key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      className="transition-colors hover:bg-slate-50/70"
                      key={row.id}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td className="px-4 py-4 align-top" key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!isLoading && table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-slate-500"
                        colSpan={routeColumns.length}
                      >
                        <Inbox className="mx-auto size-6 text-slate-400" />
                        <p className="mt-2 font-bold">
                          No routes yet — build the first one above
                        </p>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-600">
              <p>
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {Math.max(table.getPageCount(), 1)} · {filteredRoutes.length}{" "}
                routes
              </p>
              <div className="flex gap-2">
                <Button
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          </article>

          <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
            <MapPin className="mt-0.5 size-4 shrink-0 text-lime-600" />
            Directions open in the worker&apos;s own mapping app — the same
            universal links power the upcoming mobile field view.
          </p>
        </div>
      </main>
    </AppShell>
  );
};

export const Route = createFileRoute("/admin_/routes")({
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
  component: AdminRoutesPage,
  ssr: false,
});
