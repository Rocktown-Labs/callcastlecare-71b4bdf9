import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/marketing/info-page";
import { SupportForm } from "@/components/support/support-form";

const siteUrl = "https://callcastlecare.com";
const pageUrl = `${siteUrl}/press`;
const pageTitle = "Press | CastleCare";
const pageDescription =
  "Press and partnership inquiries for CastleCare, an Arkansas home-service booking platform for lawn care, laundry pickup, and window washing.";

const RouteComponent = () => (
  <InfoPage
    description="For press, partnerships, or local launch questions, send the details and CastleCare will follow up directly."
    eyebrow="Company"
    title="Press and partnerships"
  >
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <SupportForm sourcePath="/press" title="Send a press inquiry" />
      </div>
    </section>
  </InfoPage>
);

export const Route = createFileRoute("/press")({
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
