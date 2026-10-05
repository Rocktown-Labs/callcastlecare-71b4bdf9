import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/marketing/info-page";

const siteUrl = "https://callcastlecare.com";
const pageUrl = `${siteUrl}/terms`;
const pageTitle = "Terms of Service | CastleCare";
const pageDescription =
  "CastleCare terms covering home service bookings, deposits, payments, Right to Fix First guarantees, provider agreements, cancellations, and acceptable platform use.";

const sections = [
  {
    body: "CastleCare helps customers request and book home services including lawn care, laundry pickup, and window washing. Work is performed by CastleCare directly or by background-verified CastleCare Pro providers as part of our certified service network.",
    title: "1. The CastleCare platform",
  },
  {
    body: "Customers agree to provide accurate contact, address, access, service, and property information. You are responsible for making the property reasonably accessible, securing pets, and maintaining safe working conditions during the scheduled 2-hour service window.",
    title: "2. Customer responsibilities & property access",
  },
  {
    body: "Quotes and starting prices are calculated based on user-submitted details (e.g. grass height, window stories, bedding inclusions). Final charges may be adjusted if actual property conditions, window counts, or scope differ materially from initial disclosures.",
    title: "3. Quotes, scope & transparent pricing",
  },
  {
    body: "Some services require a deposit to reserve the 2-hour arrival window. Laundry-only bookings require payment upon pickup or before delivery. Remaining balances are billed or collected according to the checkout option selected.",
    title: "4. Deposits, billing & payment authorization",
  },
  {
    body: "CastleCare stands behind the quality of every completed service. If a customer is unsatisfied with a lawn cut, window washing, or laundry order, CastleCare reserves the Right to Fix First: our team or provider will perform a complimentary re-service within 48 hours to correct any specific quality defects prior to issuing any partial or full refund, provided no intentional property damage occurred.",
    title: "5. Quality satisfaction & Right to Fix First",
  },
  {
    body: "Booking cancellations made at least 12 hours prior to the scheduled window receive a full deposit refund or credit. Same-day cancellations, inaccessible properties, or no-shows after provider arrival may forfeit the deposit or incur a $25 dispatch fee.",
    title: "6. Cancellations & rescheduling policy",
  },
  {
    body: "CastleCare Pro providers operate as 1099 independent contractors. Providers must complete background & MVR screening ($50 express setup fee), maintain valid equipment and vehicle insurance, submit required in-app before/after photo proof, and uphold strict customer privacy. Earnings begin at a 60/40 payout split with 70/30 (Gold) and 80/20 (Elite) performance tiers based on completed job ratings.",
    title: "7. CastleCare Pro provider terms & 1099 agreement",
  },
  {
    body: "Users and providers shall not submit false information, tamper with service tracking, harass platform members, or engage in direct off-platform circumvention. CastleCare reserves the right to suspend accounts for safety, fraud, or quality violations.",
    title: "8. Acceptable use & network integrity",
  },
  {
    body: "CastleCare is not liable for indirect, incidental, or consequential damages to the maximum extent permitted by applicable law. Service liability for verified property damage caused directly by provider negligence is limited to actual direct repair costs.",
    title: "9. Limits of liability",
  },
] as const;

const RouteComponent = () => (
  <InfoPage
    description="These terms describe the practical rules for using CastleCare to book, provide, and manage home services, including our Quality Satisfaction Right to Fix First guarantee and Provider 1099 terms."
    eyebrow="Legal"
    title="Terms of Service"
  >
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-lime-300/60 bg-lime-500/10 p-5 text-sm leading-6 text-slate-800">
          <p className="font-extrabold text-slate-950">
            Guaranteed Quality & Service Protection
          </p>
          <p className="mt-1 text-slate-700">
            Every booking is backed by our{" "}
            <strong>Right to Fix First Guarantee</strong>. If a service is not
            performed to 5-star standards, we send a provider to correct it
            within 48 hours free of charge before any refund processing.
          </p>
        </div>
        <div className="mt-8 grid gap-5">
          {sections.map((section) => (
            <article
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              key={section.title}
            >
              <h2 className="text-xl font-black text-slate-950">
                {section.title}
              </h2>
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
