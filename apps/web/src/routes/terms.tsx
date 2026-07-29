import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/marketing/info-page";

const siteUrl = "https://callcastlecare.com";
const pageUrl = `${siteUrl}/terms`;
const pageTitle = "Terms of Service | CastleCare";
const pageDescription =
  "CastleCare terms covering home service bookings, deposits, payments, cancellations, providers, accounts, and acceptable platform use.";

const sections = [
  {
    body: "CastleCare helps customers request and book home services including lawn care, laundry pickup, and window washing. Some work may be performed by CastleCare directly and some may be performed by approved providers as the network grows.",
    title: "The CastleCare platform",
  },
  {
    body: "Customers agree to provide accurate contact, address, access, service, and payment information. You are responsible for making the property reasonably accessible and safe for the scheduled service window.",
    title: "Customer responsibilities",
  },
  {
    body: "Quotes and starting prices are based on the details provided. Final pricing can change when property conditions, item counts, window panes, bedding, access, or custom service needs differ from the submitted details.",
    title: "Quotes and pricing",
  },
  {
    body: "Some services require a deposit to reserve the appointment. Laundry-only bookings may require full payment before pickup. Remaining balances may be invoiced or collected according to the checkout option selected.",
    title: "Deposits and payments",
  },
  {
    body: "If you need to change or cancel a booking, contact CastleCare as early as possible. Same-day changes, inaccessible properties, unsafe conditions, or no-shows may affect deposits or require rescheduling.",
    title: "Cancellations and rescheduling",
  },
  {
    body: "Providers are expected to follow CastleCare standards, document work when required, communicate service issues, and comply with applicable laws. Provider access may be limited, paused, or removed for quality, safety, or trust reasons.",
    title: "Provider standards",
  },
  {
    body: "Do not misuse the site, submit false information, interfere with service operations, attempt unauthorized access, harass providers or customers, or use CastleCare for unlawful purposes.",
    title: "Acceptable use",
  },
  {
    body: "CastleCare is not liable for indirect, incidental, or consequential damages to the maximum extent allowed by law. Some rights may vary by state and cannot be waived.",
    title: "Limits of liability",
  },
] as const;

const RouteComponent = () => (
  <InfoPage
    description="These terms describe the practical rules for using CastleCare to book, provide, and manage home services."
    eyebrow="Legal"
    title="Terms of Service"
  >
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          Effective July 28, 2026. This starter terms page should be reviewed by
          counsel before relying on it as final legal language.
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

export const Route = createFileRoute("/terms")({
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
