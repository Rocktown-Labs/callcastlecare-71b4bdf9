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
  step: z
    .enum(["schedule", "contact", "details", "products", "plans", "invoice"])
    .optional(),
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
      <section className="relative overflow-hidden bg-[#070b14] px-4 pb-20 pt-28 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0">
          <img
            alt=""
            aria-hidden="true"
            className="size-full object-cover opacity-20"
            src="/callcastlecare/media/lawn-care-rider-night.png"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(163,230,53,0.18),transparent_32%),linear-gradient(120deg,#070b14_0%,rgba(7,11,20,0.96)_48%,rgba(7,11,20,0.76)_100%)]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.64fr_1.36fr]">
          <div className="lg:sticky lg:top-28 lg:h-fit">
            <span className="inline-flex rounded-full border border-lime-300/30 bg-lime-300/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-lime-200">
              Guided booking
            </span>
            <h1 className="mt-6 text-pretty text-4xl font-black leading-tight sm:text-5xl">
              Tell us what your castle needs.
            </h1>
            <p className="mt-5 text-base leading-8 text-white/62">
              Choose services, answer only the questions that matter, and review
              a clean invoice before checkout.
            </p>
            <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-slate-950/30 backdrop-blur">
              <div className="border-b border-white/10 p-5">
                <p className="text-sm font-semibold text-white">
                  Service area focus
                </p>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  Built around {centralArkansasArea} with address and location
                  inputs ready for coverage checks.
                </p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
                {["Saved draft", "Quote first", "$50 deposit"].map((item) => (
                  <div className="p-4" key={item}>
                    <p className="text-xs font-bold uppercase tracking-widest text-lime-200">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <BookingWizard
            initialAddress={search.address}
            initialDate={search.date}
            initialServices={initialServices}
            initialStep={search.step}
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
      { title: "Book Home Services | CastleCare" },
      {
        content:
          "Book lawn care, laundry, and window washing in Central Arkansas with CastleCare.",
        name: "description",
      },
      { content: "noindex,follow", name: "robots" },
    ],
  }),
  validateSearch: (search) => bookingSearchSchema.parse(search),
});
