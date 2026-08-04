import { Card, CardContent } from "@callcastlecare/ui/components/card";
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
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import MarketingLayout from "@/components/home/marketing-layout";
import { authClient } from "@/lib/auth-client";

const searchSchema = z.object({
  plan: z.string().optional(),
  session_id: z.string().optional(),
  type: z.string().optional(),
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
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);

  const isProviderFlow = search.type === "provider";

  const handleProviderVerification = async () => {
    setIsVerifying(true);
    let storedEmail = "";

    if (typeof window !== "undefined") {
      storedEmail =
        window.sessionStorage.getItem("better-auth-ui.verify-email") ?? "";
    }

    if (storedEmail) {
      await authClient.signUp.email(
        {
          callbackURL: "/dashboard/provider",
          email: storedEmail,
          name: "CastleCare Provider",
          password: "TempPassword123!",
        },
        {
          onError: () => {
            setIsVerifying(false);
            void navigate({
              search: { redirectTo: "/dashboard/provider" },
              to: "/verify-email",
            });
            toast.success("Check your email to verify your provider account.");
          },
          onSuccess: () => {
            setIsVerifying(false);
            void navigate({
              search: { redirectTo: "/dashboard/provider" },
              to: "/verify-email",
            });
            toast.success("Check your email to verify your provider account.");
          },
        }
      );
    } else {
      setIsVerifying(false);
      void navigate({
        search: { redirectTo: "/dashboard/provider" },
        to: "/verify-email",
      });
      toast.success("Check your email to verify your provider account.");
    }
  };

  return (
    <MarketingLayout>
      <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3.5 py-1.5 text-sm font-bold text-lime-300">
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  {isProviderFlow
                    ? "Express Onboarding Authorized ($50.00)"
                    : "Checkout complete"}
                </p>
                <h1 className="text-4xl font-extrabold tracking-normal text-white sm:text-5xl">
                  {isProviderFlow
                    ? "Stripe payment confirmed!"
                    : "Your CastleCare booking is in."}
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  {isProviderFlow
                    ? "Your $50 background check and MVR route authorization has been confirmed by Stripe. The final step is verifying your email address."
                    : "We have your checkout details and the next step is making sure your account is easy to access from here on out."}
                </p>
                {search.session_id ? (
                  <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-mono text-slate-300">
                    Stripe Session ID: {search.session_id}
                  </p>
                ) : null}
              </div>

              {isProviderFlow ? (
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lime-300 px-6 font-extrabold text-slate-950 transition-colors hover:bg-lime-200"
                  disabled={isVerifying}
                  onClick={handleProviderVerification}
                  type="button"
                >
                  <Mail className="size-4" />
                  Verify Email & Continue
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              ) : (
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lime-300 px-5 font-semibold text-slate-950 transition-colors hover:bg-lime-200"
                  to="/claim-account"
                >
                  Claim account
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              )}
            </div>

            {isProviderFlow ? (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <Card className="rounded-3xl border-white/10 bg-white/5 text-white">
                  <CardContent className="p-5">
                    <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-lime-300 text-slate-950 font-bold">
                      <ShieldCheck className="size-5" />
                    </div>
                    <h2 className="text-lg font-bold text-white">
                      Screening active
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Background and driving record check submitted.
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-3xl border-white/10 bg-white/5 text-white">
                  <CardContent className="p-5">
                    <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-lime-300 text-slate-950 font-bold">
                      <Mail className="size-5" />
                    </div>
                    <h2 className="text-lg font-bold text-white">
                      Verify email
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Check your inbox to confirm your account login.
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-3xl border-white/10 bg-white/5 text-white">
                  <CardContent className="p-5">
                    <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-lime-300 text-slate-950 font-bold">
                      <ArrowRight className="size-5" />
                    </div>
                    <h2 className="text-lg font-bold text-white">
                      Provider Hub
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Access route blocks & job dispatch dashboard.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {steps.map((step) => (
                  <Card
                    className="rounded-3xl border-slate-200"
                    key={step.title}
                  >
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
            )}

            <div className="mt-8 flex flex-wrap gap-3 border-white/10 border-t pt-6">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full bg-lime-300 px-5 text-sm font-bold text-slate-950 transition-colors hover:bg-lime-200"
                to={isProviderFlow ? "/dashboard/provider" : "/dashboard"}
              >
                {isProviderFlow ? "Provider Hub" : "Open dashboard"}
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
