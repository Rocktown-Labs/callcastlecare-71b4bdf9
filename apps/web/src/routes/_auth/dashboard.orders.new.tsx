import { createFileRoute } from "@tanstack/react-router";

import BookingWizard from "@/components/book/booking-wizard";

const DashboardOrdersNewRoute = () => (
  <main className="px-4 py-6 text-slate-950 sm:py-10">
    <div className="mx-auto max-w-5xl">
      <BookingWizard initialServices={["lawncare"]} />
    </div>
  </main>
);

export const Route = createFileRoute("/_auth/dashboard/orders/new")({
  component: DashboardOrdersNewRoute,
});
