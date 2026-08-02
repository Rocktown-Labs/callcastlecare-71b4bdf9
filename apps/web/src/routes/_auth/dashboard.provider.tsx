import { cn } from "@callcastlecare/ui/lib/utils";
import { Link, createFileRoute, useSearch } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Crown,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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
  plan: z.enum(["free", "pro"]).optional(),
});

interface StoredProviderApplication {
  availableDays?: string[];
  city?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  plan?: "free" | "pro";
  phone?: string;
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

// eslint-disable-next-line complexity
const ProviderStatusRoute = () => {
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
            applicationFormData: application,
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
    "Provider applicant";
  const addressParts = [
    application?.streetAddress,
    application?.unit ? `Unit ${application.unit}` : null,
    application?.city,
    application?.state,
    application?.zip,
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:py-10">
      <div className="mx-auto grid max-w-5xl gap-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase text-lime-700">
                Provider dashboard
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Application status
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Your application is saved for review. This page will become the
                home base for status, next steps, account details, and field
                work once dispatch is enabled for your area.
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
              {selectedPlan === "pro" ? "CastleCare Pro" : "Standard Provider"}
            </span>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-lime-100 text-lime-700">
                <ClipboardList className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-black">Review in progress</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  We will review your service fit, coverage area, and basic
                  account details. The next stage covers dispatch readiness,
                  payment setup, and any driving checks needed for work routes.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Application",
                  value: isProfileSaved ? "Saved" : "Received",
                },
                { label: "Dispatch access", value: "Pending" },
                { label: "Payments", value: "Not started" },
              ].map((item) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  key={item.label}
                >
                  <p className="text-xs font-black uppercase text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 font-black">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">{applicantName}</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              <p className="flex items-start gap-2">
                <BriefcaseBusiness className="mt-0.5 size-4 text-lime-700" />
                <span>
                  {(application?.services ?? [])
                    .map((service) => serviceLabels[service] ?? service)
                    .join(", ") || "Services pending"}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 size-4 text-lime-700" />
                <span>
                  {(application?.availableDays ?? [])
                    .map((day) => dayLabels[day] ?? day)
                    .join(", ") || "Availability pending"}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-lime-700" />
                <span>{addressParts.join(", ") || "Address pending"}</span>
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-lime-300/40 bg-lime-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-sm font-black uppercase text-lime-800">
                <ShieldCheck className="size-4" />
                Next best step
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {selectedPlan === "pro"
                  ? "Pro setup is queued"
                  : "Upgrade when you are ready for Pro review"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {selectedPlan === "pro"
                  ? "Your account is ready for the Pro setup path. Payment and dispatch onboarding can be connected when provider payments are turned on."
                  : "CastleCare Pro adds priority setup and a stronger starting split. Standard applicants can still track status here while review is pending."}
              </p>
            </div>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800"
              to="/earn"
            >
              {selectedPlan === "pro" ? "Review earn page" : "View Pro option"}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};

export const Route = createFileRoute("/_auth/dashboard/provider")({
  component: ProviderStatusRoute,
  validateSearch: (search) => {
    const result = providerSearchSchema.safeParse(search);
    return {
      plan: result.success ? (result.data.plan ?? "free") : "free",
    };
  },
});
