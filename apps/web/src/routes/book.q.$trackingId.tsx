import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import BookingWizard from "@/components/book/booking-wizard";
import MarketingLayout from "@/components/home/marketing-layout";
import { bookingTimeSlots } from "@/lib/scheduling";

const quoteSearchSchema = z.object({
  checkout: z.enum(["cancelled", "success"]).optional(),
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

const BookQuotePage = () => {
  const { trackingId } = useParams({ from: "/book/q/$trackingId" });
  const search = useSearch({ from: "/book/q/$trackingId" });

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
            initialQuoteRequestId={trackingId}
            initialServices={[]}
            initialStep={search.step}
            initialTimeSlot={search.timeSlot}
          />
        </div>
      </section>
    </MarketingLayout>
  );
};

export const Route = createFileRoute("/book/q/$trackingId")({
  component: BookQuotePage,
  validateSearch: (search) => quoteSearchSchema.parse(search),
});
