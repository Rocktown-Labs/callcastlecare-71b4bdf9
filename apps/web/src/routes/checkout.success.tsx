import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Mail,
  ReceiptText,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { z } from "zod";

import MarketingLayout from "@/components/home/marketing-layout";

const searchSchema = z.object({
  plan: z.string().optional(),
  session_id: z.string().optional(),
  type: z.string().optional(),
});

const customerSteps = [
  {
    description:
      "Your selected 2-hour service window is attached to the booking.",
    icon: CalendarClock,
    title: "Your booking is secured",
  },
  {
    description:
      "We’ll send your receipt and service updates to the email used at checkout.",
    icon: ReceiptText,
    title: "Receipt & updates are next",
  },
  {
    description:
      "Claim your account to view status, invoices, and follow-up details anytime.",
    icon: UserRoundCheck,
    title: "Manage everything in one place",
  },
] as const;

const providerSteps = [
  {
    description:
      "Your background and driving record checks are ready for review.",
    icon: ShieldCheck,
    title: "Screening is underway",
  },
  {
    description:
      "Check your inbox to confirm your email and finish account setup.",
    icon: Mail,
    title: "Verify your email",
  },
  {
    description:
      "After verification, continue to your provider dashboard and equipment checklist.",
    icon: ArrowRight,
    title: "Continue to Provider Hub",
  },
] as const;

const actionLinkClassName =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

interface SuccessStepProps {
  description: string;
  icon: LucideIcon;
  index: number;
  title: string;
}

const SuccessStep = ({
  description,
  icon: Icon,
  index,
  title,
}: SuccessStepProps) => (
  <li className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-sm">
    <div className="flex items-start gap-4">
      <div
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lime-300 text-slate-950"
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-300">
          Step {index}
        </p>
        <h2 className="mt-1 text-base font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
      </div>
    </div>
  </li>
);

export const CheckoutSuccessPage = () => {
  const search = useSearch({ from: "/checkout/success" });
  const navigate = useNavigate();

  const isProviderFlow = search.type === "provider";

  const handleProviderVerification = () => {
    void navigate({
      search: { redirectTo: "/dashboard/provider" },
      to: "/verify-email",
    });
  };

  const steps = isProviderFlow ? providerSteps : customerSteps;

  return (
    <MarketingLayout>
      <section
        aria-labelledby="checkout-success-title"
        className="relative overflow-hidden bg-slate-950 px-4 pb-16 pt-28 text-white sm:px-6 sm:pb-24 sm:pt-36 lg:px-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-20 size-96 -translate-x-1/2 rounded-full bg-lime-300/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/95 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
            <div className="p-6 sm:p-10 lg:p-12">
              <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl">
                  <output
                    aria-live="polite"
                    className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3.5 py-1.5 text-sm font-bold text-lime-300"
                  >
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                    {isProviderFlow
                      ? "Authorization payment received"
                      : "Payment received"}
                  </output>
                  <h1
                    className="mt-6 max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl"
                    id="checkout-success-title"
                  >
                    {isProviderFlow
                      ? "Your provider setup is ready for the next step."
                      : "Your CastleCare booking is confirmed."}
                  </h1>
                  <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-slate-300 sm:text-lg">
                    {isProviderFlow
                      ? "Your $50 background check and MVR authorization payment was accepted. Verify your email to finish setting up your provider account."
                      : "Your payment was accepted, and we’re preparing your service details. We’ll send your receipt and next updates to the email used at checkout."}
                  </p>
                </div>

                <div className="inline-flex shrink-0 items-center gap-2 text-sm text-slate-300">
                  <ShieldCheck
                    aria-hidden="true"
                    className="size-5 text-lime-300"
                  />
                  Securely processed by Stripe
                </div>
              </div>

              <div className="mt-10 border-t border-white/10 pt-8">
                <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white/60">
                  What happens next
                </h2>
                <ol className="mt-4 grid gap-4 md:grid-cols-3">
                  {steps.map((step, index) => (
                    <SuccessStep index={index + 1} key={step.title} {...step} />
                  ))}
                </ol>
              </div>

              <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-sm leading-6 text-slate-400">
                  {isProviderFlow
                    ? "Your verification email should arrive shortly."
                    : "Questions about your booking? Keep this confirmation page handy while we prepare your service."}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {isProviderFlow ? (
                    <button
                      className={`${actionLinkClassName} bg-lime-300 text-slate-950 hover:bg-lime-200`}
                      onClick={handleProviderVerification}
                      type="button"
                    >
                      Verify email & continue
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </button>
                  ) : (
                    <Link
                      className={`${actionLinkClassName} bg-lime-300 text-slate-950 hover:bg-lime-200`}
                      to="/claim-account"
                    >
                      Claim your account
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  )}
                  {!isProviderFlow && (
                    <Link
                      className={`${actionLinkClassName} border border-white/15 text-white hover:border-white/30 hover:bg-white/10`}
                      to="/dashboard"
                    >
                      Open dashboard
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export const Route = createFileRoute("/checkout/success")({
  component: CheckoutSuccessPage,
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
