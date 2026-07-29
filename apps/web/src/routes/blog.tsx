import { createFileRoute, Link } from "@tanstack/react-router";

import { InfoPage } from "@/components/marketing/info-page";

const siteUrl = "https://callcastlecare.com";
const pageUrl = `${siteUrl}/blog`;
const pageTitle = "CastleCare Blog | Home Service Updates";
const pageDescription =
  "CastleCare updates on lawn care, laundry pickup, window washing, Arkansas service areas, and home-service booking.";

const RouteComponent = () => (
  <InfoPage
    description="CastleCare will use this space for practical home-service guides, launch updates, and service-area announcements."
    eyebrow="Resources"
    title="CastleCare Blog"
  >
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-black tracking-tight">
          Guides are coming soon
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          For now, the best place to learn what CastleCare offers is the service
          catalog and FAQ.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
            to="/faq"
          >
            Read FAQ
          </Link>
          <Link
            className="rounded-full bg-lime-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-lime-200"
            to="/book"
          >
            Start a quote
          </Link>
        </div>
      </div>
    </section>
  </InfoPage>
);

export const Route = createFileRoute("/blog")({
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
