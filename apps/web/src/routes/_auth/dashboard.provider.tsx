import { cn } from "@callcastlecare/ui/lib/utils";
import {
  createFileRoute,
  Link,
  useRouteContext,
  useSearch,
} from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  HelpCircle,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/dashboard/app-shell";
import { getServerUrl } from "@/lib/server-url";

const storageKey = "callcastlecare.provider-application.v1";

const serviceLabels: Record<string, string> = {
  laundry: "Laundry",
  lawncare: "Lawn Care",
  "window-washing": "Window Washing",
};

const dayLabels: Record<string, string> = {
  friday: "Friday",
  monday: "Monday",
  saturday: "Saturday",
  sunday: "Sunday",
  thursday: "Thursday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
};

const providerSearchSchema = z.object({
  checkout: z.string().optional(),
  plan: z.enum(["free", "pro"]).optional(),
});

interface StoredProviderApplication {
  availableDays?: string[];
  city?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  plan?: "free" | "pro";
  serviceRadiusMiles?: string;
  services?: string[];
  state?: string;
  streetAddress?: string;
  unit?: string;
  zip?: string;
}

const getStoredApplication = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem(storageKey);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredProviderApplication;
  } catch {
    return null;
  }
};

const ProviderStatusRoute = () => {
  const { session } = useRouteContext({ from: "/_auth/dashboard" });
  const { plan } = useSearch({ from: "/_auth/dashboard/provider" });
  const application = useMemo(() => getStoredApplication(), []);
  const [isProfileSaved, setIsProfileSaved] = useState(false);

  useEffect(() => {
    if (
      !(application?.email && application.firstName && application.lastName)
    ) {
      return;
    }

    const saveProviderProfile = async () => {
      const parsedRadius = Number(application.serviceRadiusMiles ?? 20);
      const response = await fetch(
        new URL("/api/v1/driver/profile", getServerUrl()),
        {
          body: JSON.stringify({
            applicationFormData: {
              ...application,
              paidAmountCents: 5000,
              paidAt: new Date().toISOString(),
              paymentStatus: "paid_express_50",
            },
            email: application.email,
            firstName: application.firstName,
            lastName: application.lastName,
            phone: application.phone ?? "",
            serviceRadiusMiles: Number.isFinite(parsedRadius)
              ? parsedRadius
              : 20,
            servicesOffered: application.services ?? [],
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      if (!response.ok) {
        toast.error("Provider profile could not be saved for admin review.");
        return;
      }

      setIsProfileSaved(true);
    };

    void saveProviderProfile();
  }, [application]);

  const selectedPlan = application?.plan ?? plan;
  const applicantName =
    [application?.firstName, application?.lastName].filter(Boolean).join(" ") ||
    "Provider Applicant";
  const addressParts = [
    application?.streetAddress,
    application?.unit ? `Unit ${application.unit}` : null,
    application?.city,
    application?.state,
    application?.zip,
  ].filter(Boolean);

  return (
    <AppShell userEmail={session.user?.email ?? ""} variant="provider">
      <main className="px-4 py-6 text-slate-950 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6">
          {/* Header Banner */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-900">
                  <Clock className="size-3.5 animate-pulse" />
                  Background & MVR Screening Active
                </div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Provider Holding Spot & Work Hub
                </h1>
                <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
                  Welcome to CastleCare! Your{" "}
                  <strong>$50 Express Verification Fee</strong> is authorized,
                  and your background check is currently being processed by our
                  compliance team.
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black",
                  selectedPlan === "pro"
                    ? "bg-lime-300 text-slate-950"
                    : "bg-slate-950 text-white"
                )}
              >
                {selectedPlan === "pro" ? (
                  <Crown className="size-4" />
                ) : (
                  <BadgeCheck className="size-4" />
                )}
                {selectedPlan === "pro"
                  ? "CastleCare Pro (60/40 ➔ 80/20)"
                  : "Standard Provider"}
              </span>
            </div>
          </section>

          {/* Status Tracker */}
          <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-lime-100 text-lime-800">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <h2 className="text-xl font-black">
                    Same-Day Screening Status
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    CastleCare admins review your background check, driving
                    record (MVR), vehicle specs, and ZIP code service radius.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase text-emerald-800">
                    $50 Setup Fee
                  </p>
                  <p className="mt-1 flex items-center gap-1 font-black text-emerald-900">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Authorized
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-black uppercase text-amber-800">
                    Background Check
                  </p>
                  <p className="mt-1 flex items-center gap-1 font-black text-amber-900">
                    <Clock className="size-4 text-amber-600" />
                    In Progress
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Stripe Connect
                  </p>
                  <p className="mt-1 font-black text-slate-500">Unlocks Next</p>
                </div>
              </div>
            </div>

            {/* Applicant Info Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xl font-black">{applicantName}</h2>
                <span className="text-xs font-bold text-slate-500">
                  {isProfileSaved ? "Profile Saved" : "Queue Received"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <p className="flex items-start gap-2">
                  <BriefcaseBusiness className="mt-0.5 size-4 shrink-0 text-lime-700" />
                  <span>
                    {(application?.services ?? [])
                      .map((service) => serviceLabels[service] ?? service)
                      .join(", ") || "Services pending"}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-lime-700" />
                  <span>
                    {(application?.availableDays ?? [])
                      .map((day) => dayLabels[day] ?? day)
                      .join(", ") || "Availability pending"}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-lime-700" />
                  <span>
                    {addressParts.join(", ") || "Address pending"} (
                    {application?.serviceRadiusMiles ?? 20} mi radius)
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* Stripe Connect Payout Unlocking Banner */}
          <section className="rounded-3xl border border-lime-300/60 bg-lime-100/50 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-2xl">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-lime-900">
                  <CreditCard className="size-4" />
                  Stripe Connect Payout Integration
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Automated 60/40 ➔ 80/20 Direct Deposits
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Once background screening is approved by CastleCare admin,
                  your <strong>Stripe Connect</strong> onboarding button will
                  unlock right here to link your bank account for instant job
                  payouts!
                </p>
              </div>
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800"
                to="/dashboard/help"
              >
                <HelpCircle className="size-4 text-lime-400" />
                Contact Onboarding Support
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
};

export const Route = createFileRoute("/_auth/dashboard/provider")({
  component: ProviderStatusRoute,
  validateSearch: (search) => {
    const result = providerSearchSchema.safeParse(search);
    return {
      checkout: result.success ? result.data.checkout : undefined,
      plan: result.success ? (result.data.plan ?? "free") : "free",
    };
  },
});
