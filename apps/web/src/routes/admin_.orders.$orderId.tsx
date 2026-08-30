import { Button } from "@callcastlecare/ui/components/button";
import { Textarea } from "@callcastlecare/ui/components/textarea";
import { cn } from "@callcastlecare/ui/lib/utils";
import {
  Link,
  createFileRoute,
  redirect,
  useParams,
  useRouteContext,
} from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { upload } from "@vercel/blob/client";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flag,
  MapPin,
  Play,
  RefreshCw,
  StickyNote,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

interface AdminOrderDetail {
  address: {
    city: string;
    formattedAddress?: string | null;
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
  items: {
    amountCents: number;
    id: number;
    label: string;
  }[];
  media: {
    asset: {
      createdAt: string;
      id: number;
      mediaType: string;
      storagePath: string;
    } | null;
    id: number;
  }[];
  order: {
    arrivedAt?: string | null;
    completedAt?: string | null;
    createdAt: string;
    id: number;
    scheduledEndAt?: string | null;
    scheduledStartAt?: string | null;
    serviceType: string;
    startedAt?: string | null;
    status: string;
    totalPriceCents: number;
  };
  statusHistory: {
    changedAt: string;
    id: number;
    note?: string | null;
    toStatus: string;
  }[];
}

type AdminAction =
  | "confirm"
  | "arrived"
  | "start"
  | "complete"
  | "cancel"
  | "fail";

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

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getServiceLabel = (serviceType: string) => {
  if (serviceType === "lawncare") {
    return "Lawn Care";
  }
  if (serviceType === "laundry") {
    return "Laundry";
  }
  if (serviceType === "window_washing") {
    return "Window Washing";
  }
  return serviceType;
};

const getAddressLabel = (address: AdminOrderDetail["address"]) =>
  address?.formattedAddress ??
  [address?.street, address?.city, address?.state, address?.zip]
    .filter(Boolean)
    .join(", ");

const getPrivateMediaUrl = (storagePath: string) => {
  const url = new URL("/api/v1/media/private", getServerUrl());
  url.searchParams.set("pathname", storagePath);
  return url.toString();
};

const actionConfig: {
  action: AdminAction;
  icon: typeof ClipboardCheck;
  label: string;
  statuses: string[];
}[] = [
  {
    action: "confirm",
    icon: ClipboardCheck,
    label: "Confirm",
    statuses: ["pending_payment", "paid", "dispatching"],
  },
  {
    action: "arrived",
    icon: MapPin,
    label: "Arrived",
    statuses: ["assigned", "dispatching", "en_route"],
  },
  {
    action: "start",
    icon: Play,
    label: "Start",
    statuses: ["arrived"],
  },
  {
    action: "complete",
    icon: CheckCircle2,
    label: "Done",
    statuses: ["arrived", "in_progress", "en_route"],
  },
  {
    action: "cancel",
    icon: XCircle,
    label: "Cancel",
    statuses: [
      "pending_payment",
      "paid",
      "dispatching",
      "assigned",
      "en_route",
      "arrived",
      "in_progress",
    ],
  },
  {
    action: "fail",
    icon: Flag,
    label: "Fail",
    statuses: [
      "pending_payment",
      "paid",
      "dispatching",
      "assigned",
      "en_route",
      "arrived",
      "in_progress",
    ],
  },
];

const MediaUpload = ({
  detail,
  mediaType,
  onUploaded,
  title,
}: {
  detail: AdminOrderDetail;
  mediaType: "service_after" | "service_before";
  onUploaded: () => Promise<void>;
  title: string;
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const media = detail.media.filter(
    (link) => link.asset?.mediaType === mediaType
  );

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const uploadUrlResponse = await fetch(
        new URL("/api/v1/media/upload-url", getServerUrl()),
        {
          body: JSON.stringify({
            contentType: file.type || "image/jpeg",
            mediaType,
            orderId: detail.order.id,
          }),
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        }
      );

      if (!uploadUrlResponse.ok) {
        throw new Error("Upload is not configured");
      }

      const uploadPayload = (await uploadUrlResponse.json()) as {
        storagePath: string;
        uploadUrl: string;
      };
      const blob = await upload(uploadPayload.storagePath, file, {
        access: "private",
        handleUploadUrl: uploadPayload.uploadUrl,
      });

      const attachResponse = await fetch(
        new URL("/api/v1/media/attach", getServerUrl()),
        {
          body: JSON.stringify({
            mediaType,
            metadata: {
              originalName: file.name,
              source: "admin_field",
            },
            orderId: detail.order.id,
            requiredForTransition:
              mediaType === "service_before" ? "in_progress" : "completed",
            storagePath: blob.pathname ?? uploadPayload.storagePath,
          }),
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        }
      );

      if (!attachResponse.ok) {
        throw new Error("Photo uploaded but could not be attached");
      }

      toast.success("Photo attached");
      await onUploaded();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-black text-slate-950">{title}</h2>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-bold text-white">
          <Upload className="size-4" />
          {isUploading ? "Uploading" : "Add"}
          <input
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={isUploading}
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {media.map((link) =>
          link.asset ? (
            <Image
              alt={`${title} ${link.asset.id}`}
              aspectRatio={1}
              className="aspect-square rounded-2xl border border-slate-200 object-cover"
              key={link.id}
              layout="fullWidth"
              src={getPrivateMediaUrl(link.asset.storagePath)}
            />
          ) : null
        )}
        {media.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm font-semibold text-slate-500">
            No photos yet.
          </div>
        ) : null}
      </div>
    </section>
  );
};

const RouteComponent = () => {
  const { session } = useRouteContext({ from: "/admin_/orders/$orderId" });
  const { orderId } = useParams({ from: "/admin_/orders/$orderId" });
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState("");

  const loadOrder = useCallback(async () => {
    await Promise.resolve();
    setIsLoading(true);
    const response = await fetch(
      new URL(`/api/v1/admin/orders/${orderId}`, getServerUrl()),
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      setIsLoading(false);
      toast.error("Order could not be loaded");
      return;
    }

    const payload = (await response.json()) as {
      detail: AdminOrderDetail;
    };
    setDetail(payload.detail);
    setIsLoading(false);
  }, [orderId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrder();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadOrder]);

  const runAction = async (action: AdminAction) => {
    setIsSaving(true);
    const response = await fetch(
      new URL(`/api/v1/admin/orders/${orderId}/actions`, getServerUrl()),
      {
        body: JSON.stringify({ action }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }
    );
    setIsSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      toast.error(payload?.error ?? "Order action failed");
      return;
    }

    toast.success("Order updated");
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
        headers: {
          "Content-Type": "application/json",
        },
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
          <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold">
            Loading order...
          </div>
        </main>
      </AppShell>
    );
  }

  const availableActions = actionConfig.filter((config) =>
    config.statuses.includes(detail.order.status)
  );

  return (
    <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
      <main className="px-4 py-5 text-slate-950 sm:py-8">
        <div className="mx-auto grid max-w-4xl gap-5">
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"
            to="/admin/orders"
          >
            <ArrowLeft className="size-4" />
            Orders
          </Link>

          <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-lime-700">
                  {getServiceLabel(detail.order.serviceType)}
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight">
                  Order #{detail.order.id}
                </h1>
              </div>
              <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black uppercase text-white">
                {detail.order.status.replaceAll("_", " ")}
              </span>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-black text-slate-950">
                  {detail.customer
                    ? `${detail.customer.firstName} ${detail.customer.lastName}`
                    : "Customer"}
                </p>
                <p className="mt-1 text-slate-600">{detail.customer?.email}</p>
                <p className="mt-1 text-slate-600">{detail.customer?.phone}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="flex items-center gap-2 font-black text-slate-950">
                  <Clock className="size-4 text-lime-600" />
                  Appointment
                </p>
                <p className="mt-1 text-slate-600">
                  {formatDateTime(detail.order.scheduledStartAt)}
                </p>
                <p className="mt-1 text-slate-600">
                  {getAddressLabel(detail.address)}
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              {detail.items.length > 0 ? (
                detail.items.map((item) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm"
                    key={item.id}
                  >
                    <span className="font-semibold">{item.label}</span>
                    <span className="font-black">
                      {formatCents(item.amountCents)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                  No line items recorded.
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                <span className="font-black">Order total</span>
                <span className="font-black text-lime-700">
                  {formatCents(detail.order.totalPriceCents)}
                </span>
              </div>
            </div>
          </section>

          <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Field actions</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {availableActions.map(({ action, icon: Icon, label }) => (
                <Button
                  className={cn(
                    "h-16 rounded-2xl text-base font-black",
                    action === "cancel" || action === "fail"
                      ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                      : "bg-lime-300 text-slate-950 hover:bg-lime-200"
                  )}
                  disabled={isSaving}
                  key={action}
                  onClick={() => void runAction(action)}
                  type="button"
                  variant={
                    action === "cancel" || action === "fail"
                      ? "outline"
                      : "default"
                  }
                >
                  <Icon className="size-5" />
                  {label}
                </Button>
              ))}
              {availableActions.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">
                  No active field actions for this status.
                </div>
              ) : null}
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Start requires a before photo. Done requires an after photo. The
              completion action records the finished status now; Stripe capture
              can be attached to this event when payment capture rules are
              ready.
            </p>
          </section>

          <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <MediaUpload
              detail={detail}
              mediaType="service_before"
              onUploaded={loadOrder}
              title="Before photos"
            />
            <MediaUpload
              detail={detail}
              mediaType="service_after"
              onUploaded={loadOrder}
              title="After photos"
            />
          </section>

          <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <StickyNote className="size-5 text-lime-600" />
              <h2 className="font-black text-slate-950">Notes</h2>
            </div>
            <Textarea
              className="min-h-28 rounded-2xl"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Private job notes, gate codes, issues, materials used..."
              value={note}
            />
            <Button
              className="h-11 rounded-full bg-slate-950 font-bold text-white hover:bg-slate-800"
              disabled={isSaving || !note.trim()}
              onClick={() => void saveNote()}
              type="button"
            >
              <Camera className="size-4" />
              Save note
            </Button>
            <div className="grid gap-2">
              {detail.statusHistory.map((entry) => (
                <div
                  className="rounded-2xl bg-slate-50 p-3 text-sm"
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
                    <p className="mt-2 leading-6 text-slate-600">
                      {entry.note}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <Button
            className="h-11 rounded-full border-slate-200 bg-white font-bold text-slate-600"
            onClick={() => void loadOrder()}
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

export const Route = createFileRoute("/admin_/orders/$orderId")({
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
  component: RouteComponent,
  ssr: false,
});
