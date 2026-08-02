import { Button } from "@callcastlecare/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarPlus, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getServerUrl } from "@/lib/server-url";

interface CustomerOrderSummary {
  createdAt: string;
  id: number;
  scheduledEndAt?: string | null;
  scheduledStartAt?: string | null;
  serviceType: string;
  status: string;
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

const formatStatusLabel = (status: string) => status.replaceAll("_", " ");

const formatServiceLabel = (serviceType: string) => {
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

const DashboardOrdersRoute = () => {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadOrders = async () => {
      setIsLoading(true);
      const response = await fetch(new URL("/api/v1/orders", getServerUrl()), {
        credentials: "include",
      });

      if (!active) {
        return;
      }

      if (response.ok) {
        const payload = (await response.json()) as {
          orders?: CustomerOrderSummary[];
        };
        setOrders(payload.orders ?? []);
      }

      setIsLoading(false);
    };

    const runLoadOrders = async () => {
      try {
        await loadOrders();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Orders failed");
        setIsLoading(false);
      }
    };

    void runLoadOrders();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="px-4 py-6 text-slate-950 sm:py-10">
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="grid gap-5 border-slate-200 border-b bg-white px-1 pb-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
              <ReceiptText className="size-4" />
              Customer orders
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              Service history
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Review upcoming and completed CastleCare visits, then open an
              order for status, totals, and support context.
            </p>
          </div>
          <Link to="/dashboard/book">
            <Button
              className="h-11 rounded-full bg-lime-300 px-5 font-bold text-slate-950 hover:bg-lime-200"
              type="button"
            >
              <CalendarPlus className="size-4" />
              Book service
            </Button>
          </Link>
        </section>

        <section className="grid gap-3">
          {isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
              Loading orders...
            </div>
          ) : null}
          {!isLoading && orders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              No service history yet.
            </div>
          ) : null}
          {orders.map((order) => (
            <Link
              className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm transition-colors hover:border-lime-300 sm:grid-cols-[1fr_auto]"
              key={order.id}
              params={{ orderId: String(order.id) }}
              to="/dashboard/orders/$orderId"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                    {formatServiceLabel(order.serviceType)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                    {formatStatusLabel(order.status)}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-black">Order #{order.id}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Created {formatDateTime(order.createdAt)}
                </p>
              </div>
              <div className="grid content-between gap-3 text-sm font-semibold text-slate-600 sm:text-right">
                <p>{formatDateTime(order.scheduledStartAt)}</p>
                <p className="text-lg font-black text-lime-700">
                  {formatCents(order.totalPriceCents)}
                </p>
                <span className="inline-flex items-center justify-end gap-2 text-slate-950">
                  Details
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
};

export const Route = createFileRoute("/_auth/dashboard/orders")({
  component: DashboardOrdersRoute,
});
