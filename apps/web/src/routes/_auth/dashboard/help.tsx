import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { MessageSquareText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SupportForm } from "@/components/support/support-form";
import { apiClient } from "@/lib/api-client";

interface OrderSummary {
  createdAt: string;
  id: number;
  serviceType: string;
  status: string;
}

const RouteComponent = () => {
  const { session } = useRouteContext({ from: "/_auth/dashboard" });
  const [orders, setOrders] = useState<OrderSummary[]>([]);

  useEffect(() => {
    let active = true;

    const loadOrders = async () => {
      const response = await apiClient.orders.$get();
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      if (active) {
        setOrders(payload.orders as OrderSummary[]);
      }
    };

    const runLoadOrders = async () => {
      try {
        await loadOrders();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Order load failed"
        );
      }
    };

    void runLoadOrders();

    return () => {
      active = false;
    };
  }, []);

  const orderOptions = orders.map((order) => ({
    id: order.id,
    label: `#${order.id} · ${order.serviceType.replaceAll("_", " ")} · ${order.status}`,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-lime-800">
            <MessageSquareText className="size-4" />
            Customer support
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight">
            Get help with a CastleCare booking
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Choose an order if one applies, then tell us what happened. This
            creates a support request in the CastleCare admin queue so we can
            follow up with the right context.
          </p>
        </section>
        <SupportForm
          defaultRequestType="dashboard_help"
          email={session.data?.user.email ?? ""}
          name={session.data?.user.name ?? ""}
          orderOptions={orderOptions}
          sourcePath="/dashboard/help"
          title="Request support"
        />
      </div>
    </main>
  );
};

export const Route = createFileRoute("/_auth/dashboard/help")({
  component: RouteComponent,
});
