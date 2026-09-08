import { Button } from "@callcastlecare/ui/components/button";
import { Textarea } from "@callcastlecare/ui/components/textarea";
import {
  Link,
  createFileRoute,
  redirect,
  useParams,
  useRouteContext,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  MapPin,
  StickyNote,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type {
  FieldAdminAction,
  FieldService,
} from "@/components/admin/field-checklist";
import { FieldChecklist } from "@/components/admin/field-checklist";
import { AppShell } from "@/components/dashboard/app-shell";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";

interface SessionPayload {
  isAdmin?: boolean;
  user?: { email?: string };
}

interface AdminOrderDetail {
  address: {
    city: string;
    formattedAddress?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    state: string;
    street: string;
    zip: string;
  } | null;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  items: { amountCents: number; id: number; label: string }[];
  order: {
    createdAt: string;
    groupStatus: string;
    groupStatusLabel: string;
    id: number;
    orderIds: number[];
    scheduledStartAt?: string | null;
    status: string;
    totalPriceCents: number;
  };
  services: FieldService[];
  statusHistory: {
    changedAt: string;
    id: number;
    note?: string | null;
    toStatus: string;
  }[];
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

const getMapUrl = (address: AdminOrderDetail["address"]) => {
  if (!address) {
    return null;
  }
  let query = address.formattedAddress;
  if (
    address.latitude !== null &&
    address.latitude !== undefined &&
    address.longitude !== null &&
    address.longitude !== undefined
  ) {
    query = `${address.latitude},${address.longitude}`;
  }
  if (!query) {
    query = `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

const RouteComponent = () => {
  const { session } = useRouteContext({ from: "/admin_/orders/$orderId" });
  const { orderId } = useParams({ from: "/admin_/orders/$orderId" });
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState("");

  const loadOrder = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch(
      new URL(`/api/v1/admin/orders/${orderId}`, getServerUrl()),
      { credentials: "include" }
    );
    if (!response.ok) {
      setIsLoading(false);
      toast.error("Order could not be loaded");
      return;
    }
    const payload = (await response.json()) as { detail: AdminOrderDetail };
    setDetail(payload.detail);
    setIsLoading(false);
  }, [orderId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadOrder(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadOrder]);

  const runAction = async (serviceId: number, action: FieldAdminAction) => {
    setIsSaving(true);
    const response = await fetch(
      new URL(`/api/v1/admin/orders/${serviceId}/actions`, getServerUrl()),
      {
        body: JSON.stringify({ action }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );
    setIsSaving(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      toast.error(payload?.error ?? "Service action failed");
      return;
    }
    toast.success("Service updated");
    await loadOrder();
  };

  const saveNote = async () => {
    if (!note.trim()) {
      return;
    }
    setIsSaving(true);
    const response = await fetch(
      new URL(`/api/v1/admin/orders/${orderId}/notes`, getServerUrl()),
      {
        body: JSON.stringify({ note }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );
    setIsSaving(false);
    if (!response.ok) {
      toast.error("Note could not be saved");
      return;
    }
    setNote("");
    toast.success("Note saved");
    await loadOrder();
  };

  if (isLoading || !detail) {
    return (
      <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
        <main className="px-4 py-8 text-slate-950">
          <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold">
            Loading service ticket...
          </div>
        </main>
      </AppShell>
    );
  }

  const addressLabel =
    detail.address?.formattedAddress ??
    [
      detail.address?.street,
      detail.address?.city,
      detail.address?.state,
      detail.address?.zip,
    ]
      .filter(Boolean)
      .join(", ");
  const mapUrl = getMapUrl(detail.address);

  return (
    <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
      <main className="px-4 py-5 text-slate-950 sm:py-8">
        <div className="mx-auto grid max-w-6xl gap-5">
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:border-slate-400 hover:text-slate-950"
            to="/admin/orders"
          >
            <ArrowLeft className="size-4" /> Job queue
          </Link>
          <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                  Service ticket
                </span>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase text-white">
                  {detail.order.groupStatusLabel}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Order #{detail.order.id}
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {detail.services.length} services ·{" "}
                {detail.order.orderIds.length} field work items · created{" "}
                {formatDateTime(detail.order.createdAt)}
              </p>
            </div>
            <div className="rounded-2xl bg-lime-50 p-4 text-left lg:text-right">
              <p className="text-xs font-black uppercase tracking-wide text-lime-800">
                Ticket total
              </p>
              <p className="mt-1 text-3xl font-black text-lime-800">
                {formatCents(detail.order.totalPriceCents)}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {detail.services
                  .map((service) => service.serviceLabel)
                  .join(" · ")}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="flex items-center gap-2 font-black">
                  <UserRound className="size-4 text-lime-600" /> Customer
                </p>
                <p className="mt-2 font-bold">
                  {detail.customer
                    ? `${detail.customer.firstName} ${detail.customer.lastName}`
                    : "Customer"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {detail.customer?.email}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {detail.customer?.phone}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="flex items-center gap-2 font-black">
                  <CalendarDays className="size-4 text-lime-600" /> Appointment
                  & address
                </p>
                <p className="mt-2 text-sm font-bold">
                  {formatDateTime(detail.order.scheduledStartAt)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {addressLabel || "No address recorded"}
                </p>
                {mapUrl ? (
                  <a
                    className="mt-3 inline-flex items-center gap-2 text-sm font-black text-lime-800 underline-offset-4 hover:underline"
                    href={mapUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <MapPin className="size-4" /> Open map{" "}
                    <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
            </div>
          </section>
          <FieldChecklist
            isSaving={isSaving}
            onAction={runAction}
            onUploaded={loadOrder}
            services={detail.services}
          />
          <section className="grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <StickyNote className="size-5 text-lime-600" />
              <h2 className="font-black">Admin notes & audit trail</h2>
            </div>
            <Textarea
              className="min-h-28 rounded-2xl"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Private job notes, gate codes, issues, materials used..."
              value={note}
            />
            <Button
              className="h-11 rounded-xl bg-slate-950 font-bold text-white hover:bg-slate-800"
              disabled={isSaving || !note.trim()}
              onClick={() => void saveNote()}
              type="button"
            >
              <StickyNote className="size-4" /> Save note
            </Button>
            <div className="grid gap-2">
              {detail.statusHistory.map((entry) => (
                <div
                  className="rounded-xl bg-slate-50 p-3 text-sm"
                  key={entry.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black capitalize">
                      {entry.toStatus.replaceAll("_", " ")}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {formatDateTime(entry.changedAt)}
                    </span>
                  </div>
                  {entry.note ? (
                    <p className="mt-1 leading-6 text-slate-600">
                      {entry.note}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
};

export const Route = createFileRoute("/admin_/orders/$orderId")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ search: { redirectTo: "/admin" }, to: "/sign-in" });
    }
    const adminSession = await getAdminSession();
    if (!adminSession?.isAdmin) {
      throw redirect({ to: "/dashboard" });
    }
    return { session: adminSession };
  },
  component: RouteComponent,
  ssr: false,
});
