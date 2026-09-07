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
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock,
  ExternalLink,
  Flag,
  ListOrdered,
  MapPin,
  MessageSquareText,
  Play,
  Route as RouteIcon,
  Send,
  ShieldCheck,
  Square,
  StickyNote,
  StopCircle,
  Trash2,
  UserRound,
  UsersRound,
  XCircle,
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

type ServiceType = "laundry" | "lawncare" | "window_washing";
type ServicePhase = "after" | "before";
type PhotoSlot =
  | "property_back"
  | "property_front"
  | "property_left"
  | "property_right"
  | "service";
type AdminAction =
  | "arrived"
  | "cancel"
  | "complete"
  | "confirm"
  | "fail"
  | "start"
  | "stop";

interface MediaLink {
  asset: {
    createdAt: string;
    id: number;
    mediaType: string;
    metadataJson?: Record<string, unknown> | null;
    storagePath: string;
  } | null;
  id: number;
  orderId: number;
}

interface WorkerRecord {
  email: string;
  firstName: string;
  id: number;
  isActive: boolean;
  lastName: string;
  onboardingStatus: string;
  phone: string;
  servicesOffered: string[];
}

interface RouteStop {
  address?: { formattedAddress?: string | null } | null;
  id: number;
  orderId: number;
  sequence: number;
  status: string;
}

interface WorkerRoute {
  id: number;
  name: string;
  routeDate: string;
  status: string;
}

interface ServiceRecord {
  assignedWorkerId?: number | null;
  checkoutMetadata?: unknown;
  id: number;
  items: { amountCents: number; id: number; label: string }[];
  media: MediaLink[];
  offers: {
    id: number;
    status: string;
    worker: WorkerRecord | null;
  }[];
  scheduledEndAt?: string | null;
  scheduledStartAt?: string | null;
  serviceLabel: string;
  serviceType: ServiceType;
  status: string;
  statusHistory: {
    changedAt: string;
    id: number;
    note?: string | null;
    toStatus: string;
  }[];
  stops: (RouteStop & { route: WorkerRoute | null })[];
  totalPriceCents: number;
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
  media: MediaLink[];
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
  services: ServiceRecord[];
  statusHistory: {
    changedAt: string;
    id: number;
    note?: string | null;
    orderId: number;
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

const getDateInputValue = (value?: string | null) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
};

const getPrivateMediaUrl = (storagePath: string) => {
  const url = new URL("/api/v1/media/private", getServerUrl());
  url.searchParams.set("pathname", storagePath);
  return url.toString();
};

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

const getRecord = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const getServiceDetails = (value: unknown, serviceType: ServiceType) => {
  const metadata = getRecord(value);
  const details = getRecord(metadata.serviceDetails);
  const detailsKey =
    serviceType === "window_washing" ? "window_washing" : serviceType;
  return getRecord(details[detailsKey]);
};

const getValueLabel = (value: unknown) =>
  typeof value === "string" && value.length > 0
    ? value.replaceAll("_", " ").replaceAll("-", " ")
    : null;

const ServiceGlyph = ({
  className,
  serviceType,
}: {
  className?: string;
  serviceType: ServiceType;
}) => {
  if (serviceType === "laundry") {
    return <ListOrdered className={className} />;
  }
  if (serviceType === "lawncare") {
    return <Square className={className} />;
  }
  return <ShieldCheck className={className} />;
};

const getServiceTone = (serviceType: ServiceType) => {
  if (serviceType === "laundry") {
    return "border-sky-200 bg-sky-50 text-sky-950";
  }
  if (serviceType === "lawncare") {
    return "border-lime-200 bg-lime-50 text-lime-950";
  }
  return "border-cyan-200 bg-cyan-50 text-cyan-950";
};

const getActionClassName = (action: AdminAction) => {
  if (action === "cancel" || action === "fail") {
    return "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100";
  }
  if (action === "complete") {
    return "bg-slate-950 text-white hover:bg-slate-800";
  }
  return "bg-lime-300 text-slate-950 hover:bg-lime-200";
};

const getActionConfig = (status: string) => {
  const actions: {
    action: AdminAction;
    icon: LucideIcon;
    label: string;
    statuses: string[];
  }[] = [
    {
      action: "confirm",
      icon: CheckCircle2,
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
      label: "Start service",
      statuses: ["arrived"],
    },
    {
      action: "stop",
      icon: StopCircle,
      label: "Stop service",
      statuses: ["in_progress"],
    },
    {
      action: "complete",
      icon: Check,
      label: "Complete",
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
  return actions.filter((action) => action.statuses.includes(status));
};

const getPhotoPhase = (asset: MediaLink["asset"]) => {
  const phase = asset?.metadataJson?.phase;
  if (phase === "after" || phase === "before") {
    return phase;
  }
  return asset?.mediaType.endsWith("_after") ? "after" : "before";
};

const getPhotoType = (phase: ServicePhase, slot: PhotoSlot) =>
  slot === "service" ? `service_${phase}` : slot;

const PhotoCapture = ({
  media,
  onUploaded,
  orderId,
  phase,
  serviceType,
  slot,
}: {
  media: MediaLink[];
  onUploaded: () => Promise<void>;
  orderId: number;
  phase: ServicePhase;
  serviceType: ServiceType;
  slot: PhotoSlot;
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const mediaType = getPhotoType(phase, slot);
  const existing = media.find(
    (link) =>
      link.asset?.mediaType === mediaType && getPhotoPhase(link.asset) === phase
  );

  const handleFile = async (files: FileList | null) => {
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
            orderId,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
      if (!uploadUrlResponse.ok) {
        throw new Error("Photo upload is not configured");
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
            metadata: { phase, serviceType, slot },
            orderId,
            requiredForTransition:
              phase === "before" ? "in_progress" : "completed",
            storagePath: blob.pathname ?? uploadPayload.storagePath,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
      if (!attachResponse.ok) {
        throw new Error("Photo uploaded but could not be attached");
      }
      toast.success(`${phase === "before" ? "Before" : "After"} photo saved`);
      await onUploaded();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Photo upload failed"
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <label className="grid min-h-36 cursor-pointer gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-2 transition-colors hover:border-lime-400 hover:bg-lime-50">
      {existing?.asset ? (
        <Image
          alt={`${phase} ${slot} property photo`}
          className="h-24 w-full rounded-xl object-cover"
          layout="fullWidth"
          src={getPrivateMediaUrl(existing.asset.storagePath)}
        />
      ) : (
        <div className="flex min-h-24 flex-col items-center justify-center gap-2 text-center text-slate-500">
          <Camera className="size-6 text-lime-600" />
          <span className="text-xs font-bold">Add photo</span>
        </div>
      )}
      <span className="flex items-center justify-between gap-2 px-1 text-xs font-black capitalize text-slate-700">
        {slot === "service" ? "Service view" : slot.replace("property_", "")}
        {existing ? <Check className="size-4 text-lime-600" /> : null}
      </span>
      <input
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={isUploading}
        onChange={(event) => {
          void handleFile(event.target.files);
          event.target.value = "";
        }}
        type="file"
      />
    </label>
  );
};

const PhotoChecklist = ({
  media,
  onUploaded,
  orderId,
  serviceType,
}: {
  media: MediaLink[];
  onUploaded: () => Promise<void>;
  orderId: number;
  serviceType: ServiceType;
}) => {
  const propertySlots: { id: PhotoSlot; label: string }[] = [
    { id: "property_front", label: "Front" },
    { id: "property_back", label: "Back" },
    { id: "property_left", label: "Left" },
    { id: "property_right", label: "Right" },
  ];
  const slots =
    serviceType === "lawncare" || serviceType === "laundry"
      ? propertySlots
      : [{ id: "service" as const, label: "Service view" }];

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-sm font-black text-slate-950">
        <Camera className="size-4 text-lime-600" /> Field photos
        <span className="text-xs font-semibold text-slate-500">
          {serviceType === "lawncare" || serviceType === "laundry"
            ? "Four sides before and after"
            : "Before and after"}
        </span>
      </div>
      {(["before", "after"] as const).map((phase) => (
        <details
          className="group rounded-2xl border border-slate-200 bg-white"
          key={phase}
          open={phase === "before"}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-black capitalize text-slate-950 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              {phase === "before" ? (
                <CircleAlert className="size-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="size-4 text-lime-600" />
              )}
              {phase} photos
            </span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 sm:grid-cols-4">
            {slots.map((slot) => (
              <PhotoCapture
                key={slot.id}
                media={media}
                onUploaded={onUploaded}
                orderId={orderId}
                phase={phase}
                serviceType={serviceType}
                slot={slot.id}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
};

const BookingDetails = ({
  metadata,
  serviceType,
}: {
  metadata: unknown;
  serviceType: ServiceType;
}) => {
  const details = getServiceDetails(metadata, serviceType);
  let fields: [string, unknown][];
  if (serviceType === "lawncare") {
    fields = [
      ["Grass height", details.grassHeight],
      ["Pets on property", details.hasPets],
      ["Obstacles", details.obstacles],
    ];
  } else if (serviceType === "laundry") {
    fields = [
      ["Bedding", details.bedding],
      ["Pickup", details.pickupMode],
    ];
  } else {
    fields = [
      ["Cleaning scope", details.cleaningScope],
      ["Window estimate", details.windowEstimate],
    ];
  }
  const visibleFields = fields.filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );
  const { siteNotes } = getRecord(metadata);
  if (visibleFields.length === 0 && typeof siteNotes !== "string") {
    return (
      <p className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
        No booking details were recorded for this service.
      </p>
    );
  }
  return (
    <div className="grid gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
        <MessageSquareText className="size-4" /> Booking details
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {visibleFields.map(([label, value]) => (
          <div className="rounded-xl bg-white p-3" key={label}>
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 font-black capitalize text-slate-950">
              {getValueLabel(value) ?? String(value)}
            </p>
          </div>
        ))}
      </div>
      {typeof siteNotes === "string" && siteNotes.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
          <p className="text-xs font-black uppercase tracking-wide">
            Site notes
          </p>
          <p className="mt-1 leading-6">{siteNotes}</p>
        </div>
      ) : null}
    </div>
  );
};

const ServiceCard = ({
  isSaving,
  onAction,
  onUploaded,
  service,
}: {
  isSaving: boolean;
  onAction: (serviceId: number, action: AdminAction) => Promise<void>;
  onUploaded: () => Promise<void>;
  service: ServiceRecord;
}) => {
  const actions = getActionConfig(service.status);
  return (
    <details
      className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
      open
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl border",
              getServiceTone(service.serviceType)
            )}
          >
            <ServiceGlyph
              className="size-6"
              serviceType={service.serviceType}
            />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black">{service.serviceLabel}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black capitalize text-slate-600">
                {service.status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-slate-500">
              Work item #{service.id} ·{" "}
              {formatDateTime(service.scheduledStartAt)} ·{" "}
              {formatCents(service.totalPriceCents)}
            </p>
          </div>
        </div>
        <ChevronDown className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-5 border-t border-slate-100 p-5">
        <BookingDetails
          metadata={service.checkoutMetadata}
          serviceType={service.serviceType}
        />
        <PhotoChecklist
          media={service.media}
          onUploaded={onUploaded}
          orderId={service.id}
          serviceType={service.serviceType}
        />
        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-black">
            <Clock className="size-4 text-lime-600" /> Field actions
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {actions.map(({ action, icon: ActionIcon, label }) => (
              <Button
                className={cn(
                  "min-h-12 rounded-xl font-black",
                  getActionClassName(action)
                )}
                disabled={isSaving}
                key={action}
                onClick={() => void onAction(service.id, action)}
                type="button"
                variant={
                  action === "cancel" || action === "fail"
                    ? "outline"
                    : "default"
                }
              >
                <ActionIcon className="size-4" />
                {label}
              </Button>
            ))}
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Worker offers are accepted or declined by the worker. Arrival,
            before photos, start, after photos, stop, and completion are
            recorded per service.
          </p>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-black">Service history</p>
          {service.statusHistory.length > 0 ? (
            service.statusHistory.map((entry) => (
              <div
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm"
                key={entry.id}
              >
                <span className="font-bold capitalize">
                  {entry.toStatus.replaceAll("_", " ")}
                  {entry.note ? ` · ${entry.note}` : ""}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {formatDateTime(entry.changedAt)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm font-semibold text-slate-500">
              No field history yet.
            </p>
          )}
        </div>
      </div>
    </details>
  );
};

const AdminOperations = ({
  detail,
  isSaving,
  onRefresh,
  workers,
}: {
  detail: AdminOrderDetail;
  isSaving: boolean;
  onRefresh: () => Promise<void>;
  workers: WorkerRecord[];
}) => {
  const [selectedWorkerByService, setSelectedWorkerByService] = useState<
    Record<number, string>
  >({});
  const [routeWorkerId, setRouteWorkerId] = useState("");
  const [routeDate, setRouteDate] = useState(
    getDateInputValue(detail.order.scheduledStartAt)
  );
  const [route, setRoute] = useState<WorkerRoute | null>(null);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);

  const loadRoute = useCallback(async () => {
    if (!routeWorkerId || !routeDate) {
      setRoute(null);
      setRouteStops([]);
      return;
    }
    const url = new URL("/api/v1/admin/routes", getServerUrl());
    url.searchParams.set("routeDate", routeDate);
    url.searchParams.set("workerId", routeWorkerId);
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      toast.error("Route could not be loaded");
      return;
    }
    const payload = (await response.json()) as {
      route: WorkerRoute | null;
      stops: RouteStop[];
    };
    setRoute(payload.route);
    setRouteStops(payload.stops ?? []);
  }, [routeDate, routeWorkerId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadRoute(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRoute]);

  const sendOffer = async (serviceId: number, workerId: string) => {
    if (!workerId) {
      toast.error("Choose a worker first");
      return;
    }
    const response = await fetch(
      new URL(`/api/v1/admin/orders/${serviceId}/dispatch`, getServerUrl()),
      {
        body: JSON.stringify({ workerId: Number(workerId) }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      toast.error(payload?.error ?? "Dispatch offer failed");
      return;
    }
    toast.success("Offer sent to worker");
    await onRefresh();
  };

  const sendWholeTicket = async () => {
    const workerId = routeWorkerId || Object.values(selectedWorkerByService)[0];
    if (!workerId) {
      toast.error("Choose a worker first");
      return;
    }
    await Promise.all(
      detail.services.map((service) => sendOffer(service.id, workerId))
    );
  };

  const createRoute = async (workerId = routeWorkerId) => {
    if (!workerId || !routeDate) {
      toast.error("Choose a worker and route date");
      return null;
    }
    const response = await fetch(
      new URL("/api/v1/admin/routes", getServerUrl()),
      {
        body: JSON.stringify({ routeDate, workerId: Number(workerId) }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );
    if (!response.ok) {
      toast.error("Route could not be created");
      return null;
    }
    const payload = (await response.json()) as { route: WorkerRoute };
    setRoute(payload.route);
    return payload.route;
  };

  const addToRoute = async (serviceId: number, workerId: string) => {
    const targetWorkerId = workerId || routeWorkerId;
    const hasMatchingRoute = route && targetWorkerId === routeWorkerId;
    if (targetWorkerId !== routeWorkerId) {
      setRouteWorkerId(targetWorkerId);
    }
    const activeRoute = hasMatchingRoute
      ? route
      : await createRoute(targetWorkerId);
    if (!activeRoute) {
      return;
    }
    const response = await fetch(
      new URL(`/api/v1/admin/routes/${activeRoute.id}/stops`, getServerUrl()),
      {
        body: JSON.stringify({ orderId: serviceId }),
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
    toast.success("Added to route");
    await loadRoute();
  };

  const removeFromRoute = async (stopId: number) => {
    if (!route) {
      return;
    }
    const response = await fetch(
      new URL(
        `/api/v1/admin/routes/${route.id}/stops/${stopId}`,
        getServerUrl()
      ),
      { credentials: "include", method: "DELETE" }
    );
    if (!response.ok) {
      toast.error("Stop could not be removed");
      return;
    }
    await loadRoute();
  };

  const routeWorker = workers.find(
    (worker) => String(worker.id) === routeWorkerId
  );

  return (
    <>
      <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-lime-700">
              <UsersRound className="size-4" /> Dispatch desk
            </p>
            <h2 className="mt-1 text-xl font-black">
              Assign the whole ticket or split the work
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Each service remains independently actionable, so one worker can
              take everything or different workers can receive separate offers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
              onChange={(event) => setRouteWorkerId(event.target.value)}
              value={routeWorkerId}
            >
              <option value="">Choose worker</option>
              {workers.map((worker) => (
                <option
                  disabled={
                    !worker.isActive || worker.onboardingStatus !== "approved"
                  }
                  key={worker.id}
                  value={worker.id}
                >
                  {worker.firstName} {worker.lastName}
                  {worker.isActive && worker.onboardingStatus === "approved"
                    ? ""
                    : " · not active"}
                </option>
              ))}
            </select>
            <Button
              className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
              disabled={isSaving || !routeWorkerId}
              onClick={() => void sendWholeTicket()}
              type="button"
            >
              <Send className="size-4" /> Send whole ticket
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          {detail.services.map((service) => {
            const selectedWorker =
              selectedWorkerByService[service.id] ??
              (service.assignedWorkerId
                ? String(service.assignedWorkerId)
                : "");
            const [latestOffer] = service.offers;
            return (
              <div
                className="grid gap-3 rounded-2xl border border-slate-200 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                key={service.id}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl border",
                      getServiceTone(service.serviceType)
                    )}
                  >
                    <ServiceGlyph
                      className="size-5"
                      serviceType={service.serviceType}
                    />
                  </span>
                  <div>
                    <p className="font-black">{service.serviceLabel}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      Work item #{service.id} ·{" "}
                      {service.status.replaceAll("_", " ")}
                      {latestOffer?.worker
                        ? ` · offer ${latestOffer.status} to ${latestOffer.worker.firstName}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <select
                    className="h-10 min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
                    onChange={(event) =>
                      setSelectedWorkerByService((current) => ({
                        ...current,
                        [service.id]: event.target.value,
                      }))
                    }
                    value={selectedWorker}
                  >
                    <option value="">Choose worker</option>
                    {workers
                      .filter((worker) =>
                        worker.servicesOffered.includes(service.serviceType)
                      )
                      .map((worker) => (
                        <option
                          disabled={
                            !worker.isActive ||
                            worker.onboardingStatus !== "approved"
                          }
                          key={worker.id}
                          value={worker.id}
                        >
                          {worker.firstName} {worker.lastName}
                        </option>
                      ))}
                  </select>
                  <Button
                    className="h-10 rounded-xl bg-lime-300 px-3 text-sm font-black text-slate-950 hover:bg-lime-200"
                    disabled={isSaving || !selectedWorker}
                    onClick={() => void sendOffer(service.id, selectedWorker)}
                    type="button"
                  >
                    <Send className="size-4" /> Send
                  </Button>
                  <Button
                    className="h-10 rounded-xl border-slate-200 px-3 text-sm font-bold"
                    onClick={() => void addToRoute(service.id, selectedWorker)}
                    type="button"
                    variant="outline"
                  >
                    <RouteIcon className="size-4" /> Route
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-lime-700">
              <RouteIcon className="size-4" /> Route builder
            </p>
            <h2 className="mt-1 text-xl font-black">
              Create a route with stops
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Build a worker’s day around scheduled stops. The same route can
              hold several tickets.
            </p>
          </div>
          <Button
            className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
            disabled={!routeWorkerId || !routeDate}
            onClick={() => void createRoute()}
            type="button"
          >
            <RouteIcon className="size-4" /> Create / load route
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
            Worker
            <select
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case text-slate-950"
              onChange={(event) => setRouteWorkerId(event.target.value)}
              value={routeWorkerId}
            >
              <option value="">Choose worker</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.firstName} {worker.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
            Route date
            <input
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case text-slate-950"
              onChange={(event) => setRouteDate(event.target.value)}
              type="date"
              value={routeDate}
            />
          </label>
          <div className="flex items-end">
            <Button
              className="h-11 rounded-xl border-slate-200"
              disabled={!routeWorkerId || !routeDate}
              onClick={() => void loadRoute()}
              type="button"
              variant="outline"
            >
              Refresh
            </Button>
          </div>
        </div>
        {route ? (
          <div className="rounded-2xl border border-lime-200 bg-lime-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-black">{route.name}</p>
                <p className="text-sm font-semibold text-slate-600">
                  {routeWorker?.firstName} {routeWorker?.lastName} ·{" "}
                  {route.routeDate} · {route.status}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-lime-800">
                {routeStops.length} stops
              </span>
            </div>
            {routeStops.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {routeStops.map((stop) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"
                    key={stop.id}
                  >
                    <span className="flex items-center gap-2 font-bold">
                      <span className="flex size-6 items-center justify-center rounded-full bg-slate-950 text-xs text-white">
                        {stop.sequence}
                      </span>
                      {stop.address?.formattedAddress ??
                        `Work item #${stop.orderId}`}
                    </span>
                    <Button
                      aria-label={`Remove stop ${stop.sequence}`}
                      className="size-8 rounded-lg border-rose-200 bg-rose-50 p-0 text-rose-700 hover:bg-rose-100"
                      onClick={() => void removeFromRoute(stop.id)}
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-slate-600">
                No stops yet. Add services from the dispatch desk above.
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">
            Choose a worker and date to load a route.
          </p>
        )}
      </section>
    </>
  );
};

const RouteComponent = () => {
  const { session } = useRouteContext({ from: "/admin_/orders/$orderId" });
  const { orderId } = useParams({ from: "/admin_/orders/$orderId" });
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
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

  useEffect(() => {
    const loadWorkers = async () => {
      const response = await fetch(
        new URL("/api/v1/admin/workers", getServerUrl()),
        { credentials: "include" }
      );
      if (response.ok) {
        const payload = (await response.json()) as { workers?: WorkerRecord[] };
        setWorkers(payload.workers ?? []);
      }
    };
    void loadWorkers();
  }, []);

  const runAction = async (serviceId: number, action: AdminAction) => {
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
          <AdminOperations
            detail={detail}
            isSaving={isSaving}
            onRefresh={loadOrder}
            workers={workers}
          />
          <section className="grid gap-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-lime-700">
                  Service work
                </p>
                <h2 className="mt-1 text-2xl font-black">Field checklist</h2>
              </div>
              <span className="text-sm font-bold text-slate-500">
                Complete each service independently
              </span>
            </div>
            {detail.services.map((service) => (
              <ServiceCard
                isSaving={isSaving}
                key={service.id}
                onAction={runAction}
                onUploaded={loadOrder}
                service={service}
              />
            ))}
          </section>
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
