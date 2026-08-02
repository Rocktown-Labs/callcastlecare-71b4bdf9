import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import BookingWizard from "@/components/book/booking-wizard";
import MarketingLayout from "@/components/home/marketing-layout";
import { bookingTimeSlots } from "@/lib/scheduling";
import { serviceIdSchema, sortServiceIds } from "@/lib/service-catalog";
import type { ServiceId } from "@/lib/service-catalog";

const siteUrl = "https://callcastlecare.com";
const bookUrl = `${siteUrl}/book`;
const bookTitle = "Book Home Services | CastleCare";
const bookDescription =
  "Reserve lawn care, laundry, and window washing in Arkansas with CastleCare.";
const bookImage = `${siteUrl}/callcastlecare/media/booking-og.png`;

const bookingSearchSchema = z.object({
  address: z.string().optional(),
  checkout: z.enum(["cancelled", "success"]).optional(),
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
  stripe_session_id: z.string().optional(),
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

  return sortServiceIds([...serviceIds]);
};

const BookPage = () => {
  const search = useSearch({ from: "/book" });
  const initialServices = parseServices(search.services, search.service);

  return (
    <MarketingLayout>
      <section className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 pb-24 pt-28 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mx-auto max-w-2xl text-pretty text-4xl font-black leading-tight sm:text-5xl">
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
    links: [{ href: bookUrl, rel: "canonical" }],
    meta: [
      { title: bookTitle },
      {
        content: bookDescription,
        name: "description",
      },
      { content: "noindex,follow", name: "robots" },
      { content: bookTitle, property: "og:title" },
      { content: bookDescription, property: "og:description" },
      { content: bookImage, property: "og:image" },
      { content: bookUrl, property: "og:url" },
      { content: "website", property: "og:type" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: bookTitle, name: "twitter:title" },
      { content: bookDescription, name: "twitter:description" },
      { content: bookImage, name: "twitter:image" },
    ],
  }),
  validateSearch: (search) => bookingSearchSchema.parse(search),
});
