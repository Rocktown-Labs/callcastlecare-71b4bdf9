import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/marketing/info-page";

const siteUrl = "https://callcastlecare.com";
const pageUrl = `${siteUrl}/faq`;
const pageTitle = "CastleCare FAQ | Booking, Deposits, and Home Services";
const pageDescription =
  "Answers about booking CastleCare lawn care, laundry pickup, window washing, service windows, deposits, subscriptions, and provider onboarding.";

const faqs = [
  {
    answer:
      "You choose the services, address, date, and two-hour arrival window. CastleCare then asks the service-specific questions needed for a useful quote and guides you to deposit or checkout.",
    question: "How does CastleCare booking work?",
  },
  {
    answer:
      "Lawn care and window washing use a $50 deposit to reserve the appointment, then the remaining balance can be invoiced, paid up front, or handled after service. Laundry-only bookings are designed to be paid up front.",
    question: "Why do some services require a deposit?",
  },
  {
    answer:
      "Public appointment windows are built as two-hour blocks. The current booking flow shows windows from 6am to 8pm so customers can choose a practical time.",
    question: "How long is each appointment window?",
  },
  {
    answer:
      "For lawn care, CastleCare asks about grass height and property fit. For laundry, it asks whether bedding is included. For window washing, it asks stories, pane count, cleaning scope, screens, and optional photos.",
    question: "What details do you need for each service?",
  },
  {
    answer:
      "CastleCare currently serves Arkansas, with Central Arkansas as the first operating focus. Service-area requests help prioritize where the network expands next.",
    question: "Where is CastleCare available?",
  },
  {
    answer:
      "Yes. The site supports recurring care plans for qualifying services, including lawn care, laundry, window washing, and combo subscriptions when the selected services qualify.",
    question: "Can I book recurring service?",
  },
  {
    answer:
      "After checkout, customers can use their CastleCare account to keep booking details, service status, deposits, and checkout preferences together.",
    question: "Do I need an account before booking?",
  },
  {
    answer:
      "Provider onboarding starts on the Earn page. CastleCare is building toward an on-demand worker network for lawn care, laundry pickup, and window washing.",
    question: "How do I work with CastleCare?",
  },
] as const;

const RouteComponent = () => (
  <InfoPage
    description="Straight answers about the current CastleCare booking flow, service details, coverage, deposits, and provider onboarding."
    eyebrow="FAQ"
    title="Questions customers ask before booking"
  >
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-4">
        {faqs.map((faq) => (
          <article
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            key={faq.question}
          >
            <h2 className="text-xl font-black tracking-tight">
              {faq.question}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              {faq.answer}
            </p>
          </article>
        ))}
      </div>
    </section>
  </InfoPage>
);

export const Route = createFileRoute("/faq")({
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
    scripts: [
      {
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
            name: faq.question,
          })),
        }),
        type: "application/ld+json",
      },
    ],
  }),
});
