import { Button } from "@callcastlecare/ui/components/button";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import {
  ArrowLeft,
  Camera,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getServerUrl } from "@/lib/server-url";

interface CustomerOrderDetail {
  address: {
    formattedAddress?: string | null;
    id: number;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  customerTimeline: {
    at: string;
    key: string;
    label: string;
    note?: string | null;
  }[];
  items: {
    amountCents: number;
    id: number;
    key: string;
    label: string;
  }[];
  legs: {
    id: number;
    legType: string;
    sequence: number;
    status: string;
  }[];
  legsMedia: CustomerMediaLink[];
  order: {
    completedAt?: string | null;
    createdAt: string;
    id: number;
    scheduledEndAt?: string | null;
    scheduledStartAt?: string | null;
    serviceType: string;
    status: string;
    totalPriceCents: number;
  };
  orderMedia: CustomerMediaLink[];
}

interface CustomerMediaLink {
  asset: {
    createdAt: string;
    id: number;
    mediaType: string;
    storagePath: string;
  } | null;
  id: number;
}

const customerFacingMediaTypes = new Set([
  "service_after",
  "lawncare_after",
  "laundry_dropoff",
  "laundry_folded",
]);

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

const formatAppointmentWindow = (
  start?: string | null,
  end?: string | null
) => {
  if (!start) {
    return "Appointment time pending";
  }

  const startDate = new Date(start);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
  }).format(startDate);
  const startLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(startDate);
  const endLabel = end
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(end))
    : "the scheduled window";

  return `${dateLabel}, between ${startLabel} and ${endLabel}`;
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
  return serviceType.replaceAll("_", " ");
};

const getPrivateMediaUrl = (storagePath: string) => {
  const url = new URL("/api/v1/media/private", getServerUrl());
  url.searchParams.set("pathname", storagePath);
  return url.toString();
};

const getCustomerPhotos = (detail: CustomerOrderDetail) =>
  [...detail.orderMedia, ...detail.legsMedia].filter((link) =>
    link.asset ? customerFacingMediaTypes.has(link.asset.mediaType) : false
  );

const RouteComponent = () => {
  const { orderId } = useParams({
    from: "/_auth/dashboard/orders/$orderId",
  });
  const [detail, setDetail] = useState<CustomerOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch(
      new URL(`/api/v1/orders/${orderId}`, getServerUrl()),
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      setIsLoading(false);
      toast.error("Order could not be loaded");
      return;
    }

    const payload = (await response.json()) as CustomerOrderDetail;
    setDetail(payload);
    setIsLoading(false);
  }, [orderId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrder();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadOrder]);

  if (isLoading || !detail) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold">
          Loading order...
        </div>
      </main>
    );
  }

  const photos = getCustomerPhotos(detail);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:py-8">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Link
          className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"
          to="/dashboard"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>

        <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
            <div className="rounded-2xl bg-lime-50 p-4">
              <p className="flex items-center gap-2 font-black text-slate-950">
                <CalendarClock className="size-4 text-lime-600" />
                Appointment window
              </p>
              <p className="mt-2 leading-6 text-slate-700">
                {formatAppointmentWindow(
                  detail.order.scheduledStartAt,
                  detail.order.scheduledEndAt
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="flex items-center gap-2 font-black text-slate-950">
                <MapPin className="size-4 text-lime-600" />
                Service address
              </p>
              <p className="mt-2 leading-6 text-slate-700">
                {detail.address?.formattedAddress ?? "Address on file"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ReceiptText className="size-5 text-lime-600" />
            <h2 className="font-black text-slate-950">Service quote</h2>
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
                No line items recorded yet.
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <span className="font-black">Estimated total</span>
              <span className="font-black text-lime-700">
                {formatCents(detail.order.totalPriceCents)}
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Camera className="size-5 text-lime-600" />
            <h2 className="font-black text-slate-950">After photos</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((link) =>
              link.asset ? (
                <Image
                  alt={`Completed service ${link.asset.id}`}
                  aspectRatio={1}
                  className="aspect-square rounded-2xl border border-slate-200 object-cover"
                  key={`${link.asset.id}-${link.id}`}
                  src={getPrivateMediaUrl(link.asset.storagePath)}
                />
              ) : null
            )}
            {photos.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm font-semibold text-slate-500">
                Photos will appear here after the service is complete.
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-lime-600" />
            <h2 className="font-black text-slate-950">Status timeline</h2>
          </div>
          <div className="grid gap-2">
            {detail.customerTimeline.map((entry) => (
              <div
                className="rounded-2xl bg-slate-50 p-3 text-sm"
                key={`${entry.key}-${entry.at}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black">{entry.label}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Clock className="size-3" />
                    {formatDateTime(entry.at)}
                  </span>
                </div>
                {entry.note ? (
                  <p className="mt-2 leading-6 text-slate-600">{entry.note}</p>
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
  );
};

export const Route = createFileRoute("/_auth/dashboard/orders/$orderId")({
  component: RouteComponent,
});
