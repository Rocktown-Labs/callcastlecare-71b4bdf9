import { Badge } from "@callcastlecare/ui/components/badge";
import { Button } from "@callcastlecare/ui/components/button";
import { Input } from "@callcastlecare/ui/components/input";
import { Label } from "@callcastlecare/ui/components/label";
import {
  createFileRoute,
  Link,
  redirect,
  useParams,
  useRouteContext,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/dashboard/app-shell";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";

interface SessionPayload {
  isAdmin?: boolean;
  user?: { email?: string };
}

interface WorkerDetail {
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
  updatedAt?: string | null;
  userId?: string | null;
}

interface WorkerDetailPayload {
  assignedOrders: {
    id: number;
    serviceType: string;
    status: string;
    totalPriceCents: number;
  }[];
  offers: {
    id: number;
    orderId: number;
    status: string;
    createdAt: string;
  }[];
  routes: unknown[];
  user: {
    email: string;
    emailVerified: boolean;
    id: string;
    name: string;
  } | null;
  worker: WorkerDetail;
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

const getFormString = (
  form: WorkerDetail["applicationFormData"],
  key: string
) => {
  const value = form?.[key];
  return typeof value === "string" ? value : "";
};

const formatCents = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);

const StaffDetailRoute = () => {
  const { session } = useRouteContext({ from: "/admin_/staff/$workerId" });
  const { workerId } = useParams({ from: "/admin_/staff/$workerId" });
  const [detail, setDetail] = useState<WorkerDetailPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editRadius, setEditRadius] = useState(20);

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        new URL(`/api/v1/admin/workers/${workerId}`, getServerUrl()),
        { credentials: "include" }
      );
      if (!response.ok) {
        toast.error("Staff record could not be loaded.");
        setIsLoading(false);
        return;
      }
      const payload = (await response.json()) as WorkerDetailPayload;
      setDetail(payload);
      setEditCity(getFormString(payload.worker.applicationFormData, "city"));
      setEditState(getFormString(payload.worker.applicationFormData, "state"));
      setEditRadius(payload.worker.serviceRadiusMiles);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Load failed");
    } finally {
      setIsLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDetail();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDetail]);

  const updateStatus = async (status: string) => {
    setIsSaving(true);
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
        toast.error(payload?.error ?? "Status could not be saved.");
        return;
      }
      toast.success(`Staff moved to ${status}.`);
      await loadDetail();
    } finally {
      setIsSaving(false);
    }
  };

  const saveLocation = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        new URL(`/api/v1/admin/workers/${workerId}`, getServerUrl()),
        {
          body: JSON.stringify({
            city: editCity,
            serviceRadiusMiles: Number(editRadius),
            state: editState,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        }
      );
      if (!response.ok) {
        toast.error("Location could not be saved.");
        return;
      }
      toast.success("Coverage area saved.");
      await loadDetail();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !detail) {
    return (
      <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
        <main className="px-4 py-8">
          <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold">
            Loading staff #{workerId}...
          </div>
        </main>
      </AppShell>
    );
  }

  const { worker, user, offers, assignedOrders } = detail;
  const city = getFormString(worker.applicationFormData, "city");
  const state = getFormString(worker.applicationFormData, "state");
  const street = getFormString(worker.applicationFormData, "streetAddress");
  const zip = getFormString(worker.applicationFormData, "zip");

  return (
    <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
      <main className="px-4 py-5 text-slate-950 sm:py-8">
        <div className="mx-auto grid max-w-4xl gap-5">
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"
            to="/admin/staff"
          >
            <ArrowLeft className="size-4" />
            Staff roster
          </Link>

          <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                  <UsersRound className="size-3.5" />
                  Staff #{worker.id}
                </div>
                <h1 className="text-3xl font-black tracking-tight">
                  {worker.firstName} {worker.lastName}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {worker.email} · {worker.phone}
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                  <MapPin className="size-4 text-lime-600" />
                  {[street, city, state, zip].filter(Boolean).join(", ") ||
                    "Location pending"}{" "}
                  · {worker.serviceRadiusMiles} mi radius
                </p>
              </div>
              <div className="grid gap-2">
                <Badge
                  className={
                    worker.onboardingStatus === "approved"
                      ? "bg-lime-100 text-lime-800"
                      : "bg-amber-100 text-amber-900"
                  }
                >
                  {worker.onboardingStatus === "approved" ? (
                    <CheckCircle2 className="mr-1 size-3" />
                  ) : null}
                  {worker.onboardingStatus.replaceAll("_", " ")}
                </Badge>
                <span className="text-xs font-bold text-slate-500">
                  Connect: {worker.stripeAccountStatus ?? "pending"} · Active:{" "}
                  {worker.isActive ? "yes" : "no"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["approved", "pending", "rejected", "suspended"] as const).map(
                (status) => (
                  <Button
                    className={
                      worker.onboardingStatus === status
                        ? "rounded-full bg-slate-950 text-white"
                        : "rounded-full"
                    }
                    disabled={isSaving || worker.onboardingStatus === status}
                    key={status}
                    onClick={() => void updateStatus(status)}
                    size="sm"
                    type="button"
                    variant={
                      worker.onboardingStatus === status ? "default" : "outline"
                    }
                  >
                    {status}
                  </Button>
                )
              )}
            </div>
          </section>

          <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
            <div>
              <h2 className="font-black">Login & services</h2>
              <p className="mt-2 text-sm text-slate-600">
                Login: {user ? `${user.name} · ${user.email}` : worker.userId}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Verified: {user?.emailVerified ? "yes" : "no"}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {worker.servicesOffered.map((service) => (
                  <Badge
                    className="bg-slate-100 text-slate-800 text-xs"
                    key={service}
                  >
                    {service.replaceAll(/[_-]+/gu, " ")}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <h2 className="font-black">Coverage area</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label>City</Label>
                  <Input
                    value={editCity}
                    onChange={(event) => setEditCity(event.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>State</Label>
                  <Input
                    value={editState}
                    onChange={(event) => setEditState(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label>Radius (miles)</Label>
                <Input
                  min={1}
                  max={100}
                  type="number"
                  value={editRadius}
                  onChange={(event) =>
                    setEditRadius(Number(event.target.value))
                  }
                />
              </div>
              <Button
                className="mt-1 rounded-full"
                disabled={isSaving}
                onClick={() => void saveLocation()}
                type="button"
                variant="outline"
              >
                Save coverage
              </Button>
            </div>
          </section>

          <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
            <div>
              <h2 className="font-black">Dispatch offers ({offers.length})</h2>
              <div className="mt-3 grid gap-2">
                {offers.length === 0 ? (
                  <p className="text-sm text-slate-500">No offers yet.</p>
                ) : (
                  offers.map((offer) => (
                    <div
                      className="rounded-2xl bg-slate-50 p-3 text-sm"
                      key={offer.id}
                    >
                      <span className="font-black">Order #{offer.orderId}</span>
                      <span className="ml-2 capitalize text-slate-600">
                        {offer.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <h2 className="font-black">
                Assigned orders ({assignedOrders.length})
              </h2>
              <div className="mt-3 grid gap-2">
                {assignedOrders.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No assigned work yet.
                  </p>
                ) : (
                  assignedOrders.map((order) => (
                    <Link
                      className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3 text-sm hover:border-lime-300"
                      key={order.id}
                      params={{ orderId: String(order.id) }}
                      to="/admin/orders/$orderId"
                    >
                      <span className="font-black">Order #{order.id}</span>
                      <span className="font-bold text-lime-700">
                        {formatCents(order.totalPriceCents)}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </section>

          <Button
            className="rounded-full"
            onClick={() => void loadDetail()}
            type="button"
            variant="outline"
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </main>
    </AppShell>
  );
};

export const Route = createFileRoute("/admin_/staff/$workerId")({
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
      throw redirect({ to: "/dashboard" });
    }
    return { session: adminSession };
  },
  component: StaffDetailRoute,
  ssr: false,
});
