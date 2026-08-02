import { Card, CardContent } from "@callcastlecare/ui/components/card";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ReceiptText,
  UserRoundCheck,
} from "lucide-react";
import { z } from "zod";

import MarketingLayout from "@/components/home/marketing-layout";

const searchSchema = z.object({
  session_id: z.string().optional(),
});

const steps = [
  {
    description:
      "Your selected 2-hour window is attached to this booking while we prepare the order.",
    icon: CalendarClock,
    title: "Appointment received",
  },
  {
    description:
      "You can claim your account to see booking status, invoices, and service updates.",
    icon: UserRoundCheck,
    title: "Account access is next",
  },
  {
    description:
      "Receipts and follow-up details stay connected to your CastleCare customer record.",
    icon: ReceiptText,
    title: "Records stay organized",
  },
] as const;

const RouteComponent = () => {
  const search = useSearch({ from: "/checkout/success" });

  return (
    <MarketingLayout>
      <section className="bg-slate-50 px-4 py-16 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3.5 py-1.5 text-sm font-semibold text-lime-800">
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  Checkout complete
                </p>
                <h1 className="text-4xl font-black tracking-normal sm:text-5xl">
                  Your CastleCare booking is in.
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  We have your checkout details and the next step is making sure
                  your account is easy to access from here on out.
                </p>
                {search.session_id && (
                  <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
                    Stripe session: {search.session_id}
                  </p>
                )}
              </div>

              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lime-300 px-5 font-semibold text-slate-950 transition-colors hover:bg-lime-200"
                to="/claim-account"
              >
                Claim account
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <Card className="rounded-3xl border-slate-200" key={step.title}>
                  <CardContent className="p-5">
                    <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-slate-950 text-lime-300">
                      <step.icon aria-hidden="true" className="size-5" />
                    </div>
                    <h2 className="text-lg font-black">{step.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3 border-slate-200 border-t pt-6">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                to="/dashboard"
              >
                Open dashboard
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-100"
                to="/book"
              >
                Book another service
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export const Route = createFileRoute("/checkout/success")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Booking Confirmed | CastleCare",
      },
      {
        content:
          "Your CastleCare checkout is complete. Claim your account to view booking status and service details.",
        name: "description",
      },
    ],
  }),
  validateSearch: searchSchema,
});
