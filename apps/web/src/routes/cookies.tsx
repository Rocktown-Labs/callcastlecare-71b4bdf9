import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/marketing/info-page";

const siteUrl = "https://callcastlecare.com";
const pageUrl = `${siteUrl}/cookies`;
const pageTitle = "Cookie Policy | CastleCare";
const pageDescription =
  "CastleCare cookie policy for authentication, booking sessions, analytics, service preferences, and website performance.";

const sections = [
  {
    body: "Essential cookies and local storage keep you signed in, preserve booking progress, support authentication, and remember quote details while you move through the site.",
    title: "Essential storage",
  },
  {
    body: "Analytics tools help CastleCare understand page visits, conversion paths, service interest, and technical performance so the product can improve.",
    title: "Analytics",
  },
  {
    body: "Payment, authentication, hosting, maps, and support providers may set their own cookies or similar technologies when their features are used.",
    title: "Third-party services",
  },
  {
    body: "You can control cookies through your browser settings. Blocking essential cookies may prevent sign-in, booking, checkout, or support forms from working correctly.",
    title: "Your controls",
  },
] as const;

const RouteComponent = () => (
  <InfoPage
    description="CastleCare uses cookies and similar browser storage to keep booking, account, analytics, and checkout experiences working."
    eyebrow="Legal"
    title="Cookie Policy"
  >
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          Effective July 28, 2026. This starter cookie policy should be reviewed
          by counsel before relying on it as final legal language.
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

export const Route = createFileRoute("/cookies")({
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
