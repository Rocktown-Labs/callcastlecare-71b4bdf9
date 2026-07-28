import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import BookingWizard from "@/components/book/booking-wizard";
import MarketingLayout from "@/components/home/marketing-layout";
import { bookingTimeSlots } from "@/lib/scheduling";
import { serviceIdSchema } from "@/lib/service-catalog";
import type { ServiceId } from "@/lib/service-catalog";

const bookingSearchSchema = z.object({
  address: z.string().optional(),
  date: z.string().optional(),
  resume: z
    .preprocess((value) => {
      if (value === "true") {
        return true;
      }
      if (value === "false") {
        return false;
      }
      return value;
    }, z.boolean().optional())
    .optional(),
  service: serviceIdSchema.optional(),
  services: z.string().optional(),
  step: z
    .enum(["schedule", "contact", "details", "products", "plans", "invoice"])
    .optional(),
  timeSlot: z.preprocess(
    (value) =>
      typeof value === "string" &&
      bookingTimeSlots.some((slot) => slot === value)
        ? value
        : undefined,
    z.enum(bookingTimeSlots).optional()
  ),
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
      <section className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 pb-24 pt-28 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full border border-lime-300 bg-lime-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-lime-700">
            Arkansas
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-pretty text-4xl font-black leading-tight sm:text-5xl">
            Reserve the care your place needs.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Pick lawn care, laundry, window washing, or any combination. We will
            save your quote, confirm the details, and keep the next step clear.
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-5xl">
          <BookingWizard
            initialAddress={search.address}
            initialDate={search.date}
            initialResumeDraft={search.resume === true}
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
          "Book lawn care, laundry, and window washing in Arkansas with CastleCare.",
        name: "description",
      },
      { content: "noindex,follow", name: "robots" },
    ],
  }),
  validateSearch: (search) => bookingSearchSchema.parse(search),
});
