import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import { InfoPage } from "@/components/marketing/info-page";
import { SupportForm } from "@/components/support/support-form";

const siteUrl = "https://callcastlecare.com";
const pageUrl = `${siteUrl}/service-areas`;
const pageTitle = "CastleCare Service Areas | Arkansas Home Services";
const pageDescription =
  "CastleCare serves Arkansas for lawn care, laundry pickup, and window washing requests, with Central Arkansas as the first operating focus.";

const cities = [
  "Little Rock",
  "North Little Rock",
  "Conway",
  "Benton",
  "Bryant",
  "Maumelle",
  "Cabot",
  "Jacksonville",
  "Sherwood",
  "Searcy",
] as const;

const RouteComponent = () => (
  <InfoPage
    description="CastleCare is built to cover Arkansas now and expand city by city as the provider network grows. Request your ZIP code if you want your area prioritized."
    eyebrow="Service map"
    title="Home services across Arkansas"
  >
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/10">
            <div className="absolute inset-6 rounded-[2rem] border border-lime-300/20" />
            <div className="absolute left-[18%] top-[22%] size-28 rounded-full bg-lime-300/20 blur-3xl" />
            <div className="absolute bottom-[18%] right-[14%] size-40 rounded-full bg-sky-300/10 blur-3xl" />
            <div className="relative">
              <MapPin className="size-8 text-lime-300" />
              <h2 className="mt-4 text-3xl font-black">Arkansas launch map</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/65">
                We are starting with the markets we can operationally support
                fastest, while accepting requests statewide.
              </p>
            </div>
            <div className="relative mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cities.map((city) => (
                <div
                  className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white/80"
                  key={city}
                >
                  {city}
                </div>
              ))}
            </div>
          </div>
        </div>
        <SupportForm
          defaultRequestType="service_area"
          showAddressFields
          showOrderReference={false}
          sourcePath="/service-areas"
          title="Request your service area"
        />
      </div>
    </section>
  </InfoPage>
);

export const Route = createFileRoute("/service-areas")({
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
