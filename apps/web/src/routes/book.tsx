import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import BookingWizard from "@/components/book/booking-wizard";
import MarketingLayout from "@/components/home/marketing-layout";
import { centralArkansasArea, serviceIdSchema } from "@/lib/service-catalog";
import type { ServiceId } from "@/lib/service-catalog";

const bookingSearchSchema = z.object({
  address: z.string().optional(),
  date: z.string().optional(),
  service: serviceIdSchema.optional(),
  services: z.string().optional(),
  timeSlot: z.string().optional(),
});

const parseServices = (services?: string, service?: ServiceId) => {
  const serviceIds = new Set<ServiceId>();

  if (service) {
    serviceIds.add(service);
  }

  for (const value of services?.split(",") ?? []) {
    const result = serviceIdSchema.safeParse(value);
    if (result.success) {
      serviceIds.add(result.data);
    }
  }

  return [...serviceIds];
};

const BookPage = () => {
  const search = useSearch({ from: "/book" });
  const initialServices = parseServices(search.services, search.service);

  return (
    <MarketingLayout>
      <section className="bg-slate-50 px-4 pb-20 pt-28 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="lg:sticky lg:top-28 lg:h-fit">
            <span className="inline-flex rounded-full border border-lime-600/20 bg-lime-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-lime-700">
              Guided booking
            </span>
            <h1 className="mt-6 text-pretty text-4xl font-black leading-tight sm:text-5xl">
              Tell us what your castle needs.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Choose services, answer only the questions that matter, and review
              a clean invoice before checkout.
            </p>
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">
                Service area focus
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Built around {centralArkansasArea} with address and location
                inputs ready for coverage checks.
              </p>
            </div>
          </div>

          <BookingWizard
            initialAddress={search.address}
            initialDate={search.date}
            initialServices={initialServices}
            initialTimeSlot={search.timeSlot}
          />
        </div>
      </section>
    </MarketingLayout>
  );
};

export const Route = createFileRoute("/book")({
  component: BookPage,
  head: () => ({
    meta: [
      { title: "Book Home Services | CallCastleCare" },
      {
        content:
          "Book lawn care, laundry, and window washing in Central Arkansas with CallCastleCare.",
        name: "description",
      },
      { content: "noindex,follow", name: "robots" },
    ],
  }),
  validateSearch: (search) => bookingSearchSchema.parse(search),
});
