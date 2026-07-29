import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/marketing/info-page";

const siteUrl = "https://callcastlecare.com";
const pageUrl = `${siteUrl}/about`;
const pageTitle = "About CastleCare | On-Demand Home Services in Arkansas";
const pageDescription =
  "CastleCare is building a premium home-service booking app for lawn care, laundry pickup, and window washing across Arkansas.";

const RouteComponent = () => (
  <InfoPage
    description="CastleCare is starting in Arkansas with the jobs that keep a household moving: lawn care, laundry pickup, and window washing."
    eyebrow="Company"
    title="A local operator today. A scalable home-service platform tomorrow."
  >
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
        {[
          "Clear booking before checkout",
          "Vetted provider network as we scale",
          "Status updates and practical support",
        ].map((item) => (
          <div
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            key={item}
          >
            <h2 className="text-xl font-black">{item}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              CastleCare is designed to feel dependable for early local
              customers while growing into a modern managed marketplace.
            </p>
          </div>
        ))}
      </div>
    </section>
  </InfoPage>
);

export const Route = createFileRoute("/about")({
  component: RouteComponent,
  head: () => ({
    links: [{ href: pageUrl, rel: "canonical" }],
    meta: [
      { title: pageTitle },
      { content: pageDescription, name: "description" },
      { content: pageTitle, property: "og:title" },
      { content: pageDescription, property: "og:description" },
      { content: pageUrl, property: "og:url" },
    ],
  }),
});
