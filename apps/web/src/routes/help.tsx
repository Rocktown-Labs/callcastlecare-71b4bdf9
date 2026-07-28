import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy, MessageSquare, PackageCheck } from "lucide-react";

import { InfoPage } from "@/components/marketing/info-page";
import { SupportForm } from "@/components/support/support-form";

const siteUrl = "https://callcastlecare.com";
const pageUrl = `${siteUrl}/help`;
const pageTitle = "Help Center | CastleCare";
const pageDescription =
  "Get help with CastleCare lawn care, laundry pickup, window washing, booking details, deposits, and service status across Arkansas.";

const helpTopics = [
  {
    copy: "Use the order number from your confirmation, or sign in and choose the order from your dashboard.",
    icon: PackageCheck,
    title: "Existing booking",
  },
  {
    copy: "Ask about time windows, deposits, service details, or what happens after you submit a quote.",
    icon: MessageSquare,
    title: "Booking question",
  },
  {
    copy: "Request coverage for a city, ZIP code, neighborhood, or recurring service need.",
    icon: LifeBuoy,
    title: "Coverage request",
  },
] as const;

const RouteComponent = () => (
  <InfoPage
    description="Tell CastleCare what you need help with. For now, every request goes into the admin queue so we can respond directly and keep learning what customers need."
    eyebrow="Support"
    title="CastleCare Help Center"
  >
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1fr]">
        <div>
          <h2 className="text-3xl font-black tracking-tight">
            The fastest way to reach CastleCare
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Send the context once and we will follow up with the next best step.
            If you already have a booking, include the order number from your
            confirmation.
          </p>
          <div className="mt-8 grid gap-4">
            {helpTopics.map(({ copy, icon: Icon, title }) => (
              <div
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                key={title}
              >
                <Icon className="size-5 text-lime-600" />
                <h3 className="mt-3 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              </div>
            ))}
          </div>
        </div>
        <SupportForm sourcePath="/help" title="Send a help request" />
      </div>
    </section>
  </InfoPage>
);

export const Route = createFileRoute("/help")({
  component: RouteComponent,
  head: () => ({
    links: [{ href: pageUrl, rel: "canonical" }],
    meta: [
      { title: pageTitle },
      { content: pageDescription, name: "description" },
      { content: pageTitle, property: "og:title" },
      { content: pageDescription, property: "og:description" },
      { content: pageUrl, property: "og:url" },
      { content: "website", property: "og:type" },
    ],
  }),
});
