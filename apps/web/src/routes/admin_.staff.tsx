/* eslint-disable react-compiler/react-compiler, react/react-compiler */
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
import type { Column, Table } from "@tanstack/react-table";
import {
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  Inbox,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/dashboard/app-shell";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";

interface SessionPayload {
  isAdmin: boolean;
  user: {
    email: string;
    id: string;
    name: string;
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

interface WorkerRecord {
  applicationFormData?: Record<string, unknown> | null;
  createdAt: string;
  email: string;
  firstName: string;
  id: number;
  isActive?: boolean | null;
  lastName: string;
  onboardingStatus: string;
  phone: string;
  serviceRadiusMiles: number;
  servicesOffered: string[];
  stripeAccountId?: string | null;
  stripeAccountStatus?: string | null;
  userId?: string | null;
}

const getFormString = (value: unknown) =>
  typeof value === "string" ? value : "";

const getWorkerCity = (worker: WorkerRecord) =>
  getFormString(worker.applicationFormData?.city);
const getWorkerState = (worker: WorkerRecord) =>
  getFormString(worker.applicationFormData?.state);

const normalizeServiceLabel = (service: string) =>
  service.replaceAll(/[_-]+/gu, " ");

const statusBadgeClass = (status: string) => {
  if (status === "approved") {
    return "bg-lime-100 text-lime-800";
  }
  if (status === "rejected") {
    return "bg-rose-100 text-rose-800";
  }
  if (status === "suspended") {
    return "bg-slate-800 text-white";
  }
  return "bg-amber-100 text-amber-900";
};

const createStaffFormSchema = z.object({
  city: z.string().trim().max(80).optional(),
  email: z.email("Enter a valid email"),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  onboardingStatus: z.enum(["pending", "approved", "rejected", "suspended"]),
  phone: z
    .string()
    .trim()
    .min(1, "Enter a phone number.")
    .regex(/^[\d\s()+.-]+$/u, "Use numbers and phone punctuation only."),
  serviceRadiusMiles: z.number().int().positive().max(100),
  servicesOffered: z
    .array(z.string().min(1))
    .min(1, "Pick at least one service"),
  state: z.string().trim().max(40).optional(),
  streetAddress: z.string().trim().max(240).optional(),
  zip: z.string().trim().max(20).optional(),
});

type CreateStaffFormValues = z.infer<typeof createStaffFormSchema>;

const serviceOptions = [
  { label: "Lawn Care", value: "lawncare" },
  { label: "Laundry", value: "laundry" },
  { label: "Window Washing", value: "window_washing" },
];

const statusOptions = ["pending", "approved", "rejected", "suspended"] as const;

type WorkerStatus = (typeof statusOptions)[number];

interface StaffTableMeta {
  onStatusChange: (workerId: number, status: WorkerStatus) => void;
  savingWorkerId: number | null;
}

const columnHelper = createColumnHelper<WorkerRecord>();

const SortToggleHeader = ({
  column,
  label,
}: {
  column: Column<WorkerRecord>;
  label: string;
}) => (
  <button
    className="inline-flex items-center gap-1 font-black uppercase"
    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    type="button"
  >
    {label}
    <ArrowUpDown className="size-3" />
  </button>
);

const StaffNameCell = ({ worker }: { worker: WorkerRecord }) => (
  <Link
    className="font-black text-slate-950 hover:text-lime-700 hover:underline"
    params={{ workerId: String(worker.id) }}
    to="/admin/staff/$workerId"
  >
    {worker.firstName} {worker.lastName}
    <span className="block text-xs font-semibold text-slate-500">
      #{worker.id} · {worker.email}
    </span>
  </Link>
);

const StaffLocationCell = ({ worker }: { worker: WorkerRecord }) => {
  const city = getWorkerCity(worker);
  const state = getWorkerState(worker);
  if (!(city || state)) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <span className="font-semibold">
      {[city, state].filter(Boolean).join(", ")}
      <span className="block text-xs font-normal text-slate-500">
        {worker.serviceRadiusMiles} mi radius
      </span>
    </span>
  );
};

const StaffServicesCell = ({ services }: { services: string[] }) => (
  <div className="flex flex-wrap gap-1">
    {services.map((service) => (
      <Badge className="bg-slate-100 text-slate-800 text-[10px]" key={service}>
        {normalizeServiceLabel(service)}
      </Badge>
    ))}
  </div>
);

const StaffStatusCell = ({ status }: { status: string }) => (
  <Badge className={statusBadgeClass(status)}>
    {status === "approved" ? <CheckCircle2 className="mr-1 size-3" /> : null}
    {status.replaceAll("_", " ")}
  </Badge>
);

const StaffConnectCell = ({
  status,
}: {
  status: string | null | undefined;
}) => (
  <span className="text-xs font-bold capitalize text-slate-600">
    {status ?? "pending"}
  </span>
);

const StaffAppliedCell = ({ value }: { value: string }) => (
  <span className="text-xs text-slate-500">
    {new Date(value).toLocaleDateString()}
  </span>
);

const StaffActionsCell = ({
  table,
  worker,
}: {
  table: Table<WorkerRecord>;
  worker: WorkerRecord;
}) => {
  const { onStatusChange, savingWorkerId } = table.options
    .meta as StaffTableMeta;
  const isSaving = savingWorkerId === worker.id;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Link
        className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-lime-300"
        params={{ workerId: String(worker.id) }}
        to="/admin/staff/$workerId"
      >
        View
      </Link>
      {worker.onboardingStatus === "approved" ? (
        <button
          className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          disabled={isSaving}
          onClick={() => onStatusChange(worker.id, "suspended")}
          type="button"
        >
          Suspend
        </button>
      ) : (
        <button
          className="inline-flex h-8 items-center rounded-full bg-lime-300 px-3 text-xs font-bold text-slate-950 hover:bg-lime-200 disabled:opacity-60"
          disabled={isSaving}
          onClick={() => onStatusChange(worker.id, "approved")}
          type="button"
        >
          {isSaving ? "Saving..." : "Approve"}
        </button>
      )}
    </div>
  );
};

const staffColumns = [
  columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
    cell: ({ row }) => <StaffNameCell worker={row.original} />,
    header: ({ column }) => <SortToggleHeader column={column} label="Staff" />,
    id: "name",
  }),
  columnHelper.accessor((row) => getWorkerCity(row), {
    cell: ({ row }) => <StaffLocationCell worker={row.original} />,
    header: "City / State",
    id: "location",
  }),
  columnHelper.accessor("servicesOffered", {
    cell: ({ getValue }) => <StaffServicesCell services={getValue() ?? []} />,
    header: "Services",
  }),
  columnHelper.accessor("onboardingStatus", {
    cell: ({ getValue }) => <StaffStatusCell status={getValue()} />,
    header: "Status",
  }),
  columnHelper.accessor("stripeAccountStatus", {
    cell: ({ getValue }) => <StaffConnectCell status={getValue()} />,
    header: "Connect",
  }),
  columnHelper.accessor("createdAt", {
    cell: ({ getValue }) => <StaffAppliedCell value={getValue()} />,
    header: ({ column }) => (
      <SortToggleHeader column={column} label="Applied" />
    ),
  }),
  columnHelper.display({
    cell: ({ row, table }) => (
      <StaffActionsCell table={table} worker={row.original} />
    ),
    header: () => <span className="float-right">Action</span>,
    id: "actions",
  }),
];

const AdminStaffRoute = () => {
  const { session } = useRouteContext({ from: "/admin_/staff" });
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [savingWorkerId, setSavingWorkerId] = useState<number | null>(null);

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        new URL("/api/v1/admin/workers", getServerUrl()),
        { credentials: "include" }
      );
      if (!response.ok) {
        toast.error("Staff roster could not be loaded.");
        setIsLoading(false);
        return;
      }
      const payload = (await response.json()) as { workers?: WorkerRecord[] };
      setWorkers(payload.workers ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Staff load failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStaff();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadStaff]);

  const filteredWorkers = useMemo(() => {
    const query = globalFilter.trim().toLowerCase();
    return workers.filter((worker) => {
      if (statusFilter !== "all" && worker.onboardingStatus !== statusFilter) {
        return false;
      }
      if (
        serviceFilter !== "all" &&
        !worker.servicesOffered
          .map((service) => service.replaceAll("-", "_"))
          .includes(serviceFilter)
      ) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [
        worker.firstName,
        worker.lastName,
        worker.email,
        worker.phone,
        getWorkerCity(worker),
        getWorkerState(worker),
        worker.onboardingStatus,
        ...worker.servicesOffered,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [workers, globalFilter, statusFilter, serviceFilter]);

  const updateWorkerStatus = async (workerId: number, status: WorkerStatus) => {
    setSavingWorkerId(workerId);
    try {
      const endpoint =
        status === "approved"
          ? `/api/v1/admin/workers/${workerId}/approve`
          : `/api/v1/admin/workers/${workerId}/status`;
      const response = await fetch(new URL(endpoint, getServerUrl()), {
        body: status === "approved" ? undefined : JSON.stringify({ status }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(payload?.error ?? "Staff status could not be saved.");
        return;
      }
      const payload = (await response.json()) as { worker: WorkerRecord };
      setWorkers((prev) =>
        prev.map((worker) =>
          worker.id === workerId ? { ...worker, ...payload.worker } : worker
        )
      );
      toast.success(`Staff #${workerId} moved to ${status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSavingWorkerId(null);
    }
  };

  const table = useReactTable({
    columns: staffColumns,
    data: filteredWorkers,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageIndex: 0, pageSize: 15 },
      sorting: [{ desc: true, id: "createdAt" }],
    },
    meta: {
      onStatusChange: (workerId: number, status: WorkerStatus) => {
        void updateWorkerStatus(workerId, status);
      },
      savingWorkerId,
    },
  });

  const pendingCount = workers.filter(
    (worker) => worker.onboardingStatus === "pending"
  ).length;
  const approvedCount = workers.filter(
    (worker) => worker.onboardingStatus === "approved"
  ).length;
  const statesCovered = new Set(
    workers.map((worker) => getWorkerState(worker)).filter(Boolean)
  ).size;

  const form = useForm({
    defaultValues: {
      city: "",
      email: "",
      firstName: "",
      lastName: "",
      onboardingStatus: "pending",
      phone: "",
      serviceRadiusMiles: 20,
      servicesOffered: ["lawncare"],
      state: "",
      streetAddress: "",
      zip: "",
    } as CreateStaffFormValues,
    onSubmit: async ({ value }) => {
      const response = await fetch(
        new URL("/api/v1/admin/workers", getServerUrl()),
        {
          body: JSON.stringify({
            ...value,
            serviceRadiusMiles: Number(value.serviceRadiusMiles),
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
        toast.error(payload?.error ?? "Staff record could not be created.");
        return;
      }
      const payload = (await response.json()) as { worker: WorkerRecord };
      setWorkers((prev) => [payload.worker, ...prev]);
      setIsCreateOpen(false);
      form.reset();
      toast.success(
        `Staff #${payload.worker.id} created with login ${payload.worker.email}.`
      );
    },
    validators: { onSubmit: createStaffFormSchema },
  });

  return (
    <AppShell
      isAdmin
      userEmail={
        (session as { user?: { email?: string } })?.user?.email ??
        "admin@callcastlecare.com"
      }
      variant="admin"
    >
      <main className="px-4 py-6 text-slate-950 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6">
          <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                <UsersRound className="size-4" />
                Staff & Provider Onboarding
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Field Network Roster
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Review CastleCare Pro applicants, manage background & MVR check
                verifications, and activate provider route access. IDs become
                the staff login once approved.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="h-11 rounded-full bg-slate-950 px-5 font-bold text-white hover:bg-slate-800"
                onClick={() => setIsCreateOpen(true)}
                type="button"
              >
                <Plus className="size-4" />
                New staff
              </Button>
              <Link to="/admin/orders">
                <Button
                  className="h-11 rounded-full bg-lime-300 px-5 font-bold text-slate-950 hover:bg-lime-200"
                  type="button"
                >
                  Dispatch queue
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Total staff", value: String(workers.length) },
              { label: "Pending review", value: String(pendingCount) },
              { label: "Approved", value: String(approvedCount) },
              { label: "States covered", value: String(statesCovered) },
            ].map(({ label, value }) => (
              <div
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                key={label}
              >
                <p className="text-sm font-bold text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-black">
                  {isLoading ? "..." : value}
                </p>
              </div>
            ))}
          </section>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Provider Applicants
                </h2>
                <p className="text-xs text-slate-500">
                  Real applications with $50 Express Onboarding verification.
                  Click a name for the full ID page.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-end">
                <div className="grid gap-1">
                  <Label>Search</Label>
                  <Input
                    className="w-full rounded-2xl lg:w-56"
                    onChange={(event) => setGlobalFilter(event.target.value)}
                    placeholder="Name, email, city, state..."
                    value={globalFilter}
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
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label>Service</Label>
                  <select
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm"
                    onChange={(event) => setServiceFilter(event.target.value)}
                    value={serviceFilter}
                  >
                    <option value="all">All services</option>
                    <option value="lawncare">Lawn Care</option>
                    <option value="laundry">Laundry</option>
                    <option value="window_washing">Window Washing</option>
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
                        colSpan={staffColumns.length}
                      >
                        <Inbox className="mx-auto size-6 text-slate-400" />
                        <p className="mt-2 font-bold">
                          No provider applications match these filters
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
                {Math.max(table.getPageCount(), 1)} · {filteredWorkers.length}{" "}
                results
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
        </div>
      </main>

      {isCreateOpen ? (
        <dialog
          aria-label="Create staff record"
          className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-end justify-center bg-slate-950/60 p-4 sm:items-center"
          onClose={() => setIsCreateOpen(false)}
          open
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Create staff record</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Creates a login + worker profile. The worker ID becomes their
                  account on approval.
                </p>
              </div>
              <button
                className="flex size-9 items-center justify-center rounded-full border border-slate-200"
                onClick={() => setIsCreateOpen(false)}
                type="button"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              className="mt-5 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field name="firstName">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="staff-firstName">First name</Label>
                      <Input
                        id="staff-firstName"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                      {field.state.meta.errors.map((error) => (
                        <p
                          key={error?.message}
                          className="text-xs text-rose-600"
                        >
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
                <form.Field name="lastName">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="staff-lastName">Last name</Label>
                      <Input
                        id="staff-lastName"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                      {field.state.meta.errors.map((error) => (
                        <p
                          key={error?.message}
                          className="text-xs text-rose-600"
                        >
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field name="email">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="staff-email">Email</Label>
                      <Input
                        id="staff-email"
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                      {field.state.meta.errors.map((error) => (
                        <p
                          key={error?.message}
                          className="text-xs text-rose-600"
                        >
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
                <form.Field name="phone">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="staff-phone">Phone</Label>
                      <Input
                        id="staff-phone"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="(501) 555-0144"
                      />
                      {field.state.meta.errors.map((error) => (
                        <p
                          key={error?.message}
                          className="text-xs text-rose-600"
                        >
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field name="servicesOffered">
                {(field) => (
                  <div className="grid gap-2">
                    <Label>Services offered</Label>
                    <div className="flex flex-wrap gap-2">
                      {serviceOptions.map((option) => {
                        const checked = field.state.value.includes(
                          option.value
                        );
                        return (
                          <label
                            key={option.value}
                            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${
                              checked
                                ? "border-lime-400 bg-lime-100 text-slate-950"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            <input
                              className="sr-only"
                              checked={checked}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...field.state.value, option.value]
                                  : field.state.value.filter(
                                      (service) => service !== option.value
                                    );
                                field.handleChange(next);
                              }}
                              type="checkbox"
                            />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                    {field.state.meta.errors.map((error) => (
                      <p key={error?.message} className="text-xs text-rose-600">
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field name="serviceRadiusMiles">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="staff-radius">
                        Service radius (miles)
                      </Label>
                      <Input
                        id="staff-radius"
                        min={1}
                        max={100}
                        type="number"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(Number(event.target.value))
                        }
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="onboardingStatus">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="staff-status">Starting status</Label>
                      <select
                        id="staff-status"
                        className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(
                            event.target
                              .value as CreateStaffFormValues["onboardingStatus"]
                          )
                        }
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </form.Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field name="streetAddress">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="staff-street">Street</Label>
                      <Input
                        id="staff-street"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="123 Main St"
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="city">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="staff-city">City</Label>
                      <Input
                        id="staff-city"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Little Rock"
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="state">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="staff-state">State</Label>
                      <Input
                        id="staff-state"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="AR"
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="zip">
                  {(field) => (
                    <div className="grid gap-1">
                      <Label htmlFor="staff-zip">ZIP</Label>
                      <Input
                        id="staff-zip"
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="72201"
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <div className="flex flex-wrap justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-slate-950 text-white hover:bg-slate-800"
                      disabled={!canSubmit || isSubmitting}
                      type="submit"
                    >
                      {isSubmitting ? "Creating..." : "Create staff + login"}
                    </Button>
                  </div>
                )}
              </form.Subscribe>
            </form>
          </div>
        </dialog>
      ) : null}
    </AppShell>
  );
};

export const Route = createFileRoute("/admin_/staff")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        search: { redirectTo: "/admin/staff" },
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
  component: AdminStaffRoute,
  ssr: false,
});
