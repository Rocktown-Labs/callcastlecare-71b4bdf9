import { Button } from "@callcastlecare/ui/components/button";
import { cn } from "@callcastlecare/ui/lib/utils";
import { Image } from "@unpic/react";
import { upload } from "@vercel/blob/client";
import type { LucideIcon } from "lucide-react";
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock,
  Flag,
  ListOrdered,
  MapPin,
  MessageSquareText,
  Play,
  ShieldCheck,
  Square,
  StopCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getServerUrl } from "@/lib/server-url";

import type {
  FieldAdminAction,
  FieldPhase,
  FieldServiceType,
} from "./field-photo-slots";
import {
  getFieldPhotoGroups,
  getFieldPhotoProgress,
  getFieldStep,
} from "./field-photo-slots";

export type { FieldAdminAction, FieldServiceType } from "./field-photo-slots";

export interface FieldMediaLink {
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

export interface FieldService {
  checkoutMetadata?: unknown;
  id: number;
  items: { amountCents: number; id: number; label: string }[];
  media: FieldMediaLink[];
  scheduledEndAt?: string | null;
  scheduledStartAt?: string | null;
  serviceLabel: string;
  serviceType: FieldServiceType;
  status: string;
  statusHistory: {
    changedAt: string;
    id: number;
    note?: string | null;
    toStatus: string;
  }[];
  totalPriceCents: number;
}

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

const getPrivateMediaUrl = (storagePath: string) => {
  const url = new URL("/api/v1/media/private", getServerUrl());
  url.searchParams.set("pathname", storagePath);
  return url.toString();
};

const getRecord = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const getServiceDetails = (value: unknown, serviceType: FieldServiceType) => {
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
  serviceType: FieldServiceType;
}) => {
  if (serviceType === "laundry") {
    return <ListOrdered className={className} />;
  }
  if (serviceType === "lawncare") {
    return <Square className={className} />;
  }
  return <ShieldCheck className={className} />;
};

const getServiceTone = (serviceType: FieldServiceType) => {
  if (serviceType === "laundry") {
    return "border-sky-200 bg-sky-50 text-sky-950";
  }
  if (serviceType === "lawncare") {
    return "border-lime-200 bg-lime-50 text-lime-950";
  }
  return "border-cyan-200 bg-cyan-50 text-cyan-950";
};

const getActionClassName = (action: FieldAdminAction) => {
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
    action: FieldAdminAction;
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

const PhotoCapture = ({
  media,
  mediaType,
  onUploaded,
  orderId,
  phase,
  serviceType,
  slotId,
  slotLabel,
}: {
  media: FieldMediaLink[];
  mediaType: string;
  onUploaded: () => Promise<void>;
  orderId: number;
  phase: FieldPhase;
  serviceType: FieldServiceType;
  slotId: string;
  slotLabel: string;
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const existing = media.find(
    (link) =>
      link.asset?.mediaType === mediaType &&
      (slotId === "service" || link.asset.metadataJson?.slot === slotId)
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
            metadata: { phase, serviceType, slot: slotId },
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
      toast.success(`${slotLabel} photo saved`);
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
          alt={`${slotLabel} ${phase} photo`}
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
        {slotLabel}
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

const BookingDetails = ({
  metadata,
  serviceType,
}: {
  metadata: unknown;
  serviceType: FieldServiceType;
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

const getInitialOpenPhase = (
  stepKey: string,
  firstIncomplete: { group: { phase: FieldPhase } } | undefined
): FieldPhase | null => {
  if (stepKey === "add_after_photos") {
    return "after";
  }
  if (stepKey === "add_before_photos") {
    return "before";
  }
  return firstIncomplete?.group.phase ?? "before";
};

const getPrimaryButtonLabel = (step: {
  key: string;
  primaryAction?: FieldAdminAction;
  title: string;
}) => {
  if (step.primaryAction) {
    return step.title;
  }
  if (step.key === "add_before_photos") {
    return "Show before photos";
  }
  return "Show after photos";
};

const ServiceCard = ({
  isSaving,
  onAction,
  onUploaded,
  service,
}: {
  isSaving: boolean;
  onAction: (serviceId: number, action: FieldAdminAction) => Promise<void>;
  onUploaded: () => Promise<void>;
  service: FieldService;
}) => {
  const actions = getActionConfig(service.status);
  const step = getFieldStep({
    actions: actions.map((action) => action.action),
    media: service.media,
    serviceType: service.serviceType,
    status: service.status,
  });
  const progress = getFieldPhotoProgress(service.serviceType, service.media);
  const firstIncomplete = progress.find((entry) => entry.done < entry.total);
  const [openPhase, setOpenPhase] = useState<FieldPhase | null>(
    getInitialOpenPhase(step.key, firstIncomplete)
  );

  const runPrimaryStep = async () => {
    if (step.primaryAction) {
      await onAction(service.id, step.primaryAction);
      return;
    }
    if (step.key === "add_before_photos") {
      setOpenPhase("before");
    } else if (step.key === "add_after_photos") {
      setOpenPhase("after");
    }
  };

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
        <div className="rounded-2xl border border-lime-200 bg-lime-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-lime-800">
                Next step
              </p>
              <p className="mt-1 font-black text-slate-950">{step.title}</p>
              <p className="mt-1 text-sm text-slate-600">{step.detail}</p>
            </div>
            {step.key === "done" ? null : (
              <Button
                className="h-11 rounded-xl bg-slate-950 px-5 font-black text-white hover:bg-slate-800"
                disabled={isSaving}
                onClick={() => void runPrimaryStep()}
                type="button"
              >
                {getPrimaryButtonLabel(step)}
              </Button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {progress.map(({ done, group, total }) => (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700"
                key={group.phase}
              >
                {done >= total ? (
                  <CheckCircle2 className="size-3.5 text-lime-600" />
                ) : (
                  <CircleAlert className="size-3.5 text-amber-600" />
                )}
                {group.phase} photos {done}/{total}
              </span>
            ))}
          </div>
        </div>
        <BookingDetails
          metadata={service.checkoutMetadata}
          serviceType={service.serviceType}
        />
        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <Camera className="size-4 text-lime-600" /> Field photos
          </div>
          {getFieldPhotoGroups(service.serviceType).map((group) => {
            const groupProgress = progress.find(
              (entry) => entry.group.phase === group.phase
            );
            return (
              <details
                className="group/phase rounded-2xl border border-slate-200 bg-white"
                key={group.phase}
                onToggle={(event) =>
                  setOpenPhase(event.currentTarget.open ? group.phase : null)
                }
                open={openPhase === group.phase}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-black capitalize text-slate-950 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    {groupProgress &&
                    groupProgress.done >= groupProgress.total ? (
                      <CheckCircle2 className="size-4 text-lime-600" />
                    ) : (
                      <CircleAlert className="size-4 text-amber-600" />
                    )}
                    {group.phase} photos · {group.hint}
                  </span>
                  <ChevronDown className="size-4 transition-transform group-open/phase:rotate-180" />
                </summary>
                <div
                  className={`grid grid-cols-2 gap-2 border-t border-slate-100 p-3 ${group.slots.length > 2 ? "sm:grid-cols-4" : ""}`}
                >
                  {group.slots.map((slot) => (
                    <PhotoCapture
                      key={slot.id}
                      media={service.media}
                      mediaType={slot.mediaType}
                      onUploaded={onUploaded}
                      orderId={service.id}
                      phase={group.phase}
                      serviceType={service.serviceType}
                      slotId={slot.id}
                      slotLabel={slot.label}
                    />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
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

export const FieldChecklist = ({
  isSaving,
  onAction,
  onUploaded,
  services,
}: {
  isSaving: boolean;
  onAction: (serviceId: number, action: FieldAdminAction) => Promise<void>;
  onUploaded: () => Promise<void>;
  services: FieldService[];
}) => (
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
    {services.map((service) => (
      <ServiceCard
        isSaving={isSaving}
        key={service.id}
        onAction={onAction}
        onUploaded={onUploaded}
        service={service}
      />
    ))}
  </section>
);
