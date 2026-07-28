import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/marketing/info-page";

const siteUrl = "https://callcastlecare.com";
const pageUrl = `${siteUrl}/privacy`;
const pageTitle = "Privacy Policy | CastleCare";
const pageDescription =
  "CastleCare privacy policy for booking home services, customer accounts, provider onboarding, payments, support, and website analytics.";

const sections = [
  {
    body: "We collect account details, contact information, service addresses, booking details, service preferences, support messages, payment status, provider application details, device data, and site analytics needed to run CastleCare.",
    title: "Information we collect",
  },
  {
    body: "We use information to create quotes, schedule services, process deposits and payments, send service updates, prevent fraud, improve support, review provider applications, maintain safety, and understand which pages and services are working.",
    title: "How we use information",
  },
  {
    body: "We share information with service providers, payment processors, background-check or onboarding vendors, hosting and analytics providers, support tools, and legal or safety partners when needed to operate the service.",
    title: "How information is shared",
  },
  {
    body: "CastleCare stores booking, support, and account records for as long as needed to provide service, comply with legal obligations, resolve disputes, prevent abuse, and improve operations.",
    title: "Retention",
  },
  {
    body: "You can request access, correction, or deletion of your personal information by contacting CastleCare through the Help Center. Some records may need to be retained for payment, tax, safety, or legal reasons.",
    title: "Your choices",
  },
  {
    body: "CastleCare uses reasonable technical and operational safeguards, but no internet service can guarantee absolute security. Use a strong password and keep account access private.",
    title: "Security",
  },
] as const;

const RouteComponent = () => (
  <InfoPage
    description="This policy explains how CastleCare handles information for customers, visitors, and future providers using our home-service booking platform."
    eyebrow="Legal"
    title="Privacy Policy"
  >
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          Effective July 28, 2026. This starter policy is written for the
          current CastleCare product and should be reviewed by counsel before
          relying on it as final legal language.
        </p>
        <div className="mt-8 grid gap-5">
          {sections.map((section) => (
            <article
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              key={section.title}
            >
              <h2 className="text-xl font-black">{section.title}</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                {section.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  </InfoPage>
);

export const Route = createFileRoute("/privacy")({
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
