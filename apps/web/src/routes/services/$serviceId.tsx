import { Button } from "@callcastlecare/ui/components/button";
import { cn } from "@callcastlecare/ui/lib/utils";
import {
  createFileRoute,
  Link,
  notFound,
  useParams,
} from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Handshake,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import MarketingLayout from "@/components/home/marketing-layout";
import {
  centralArkansasArea,
  getService,
  serviceCatalog,
  servicePageContent,
} from "@/lib/service-catalog";

const siteUrl = "https://callcastlecare.com";

const getAbsoluteUrl = (path: string) =>
  path.startsWith("http") ? path : `${siteUrl}${path}`;

const ServiceDetailPage = () => {
  const { serviceId } = useParams({ from: "/services/$serviceId" });
  const service = getService(serviceId);

  if (!service) {
    throw notFound();
  }

  const page = servicePageContent[service.id];
  const Icon = service.icon;
  const otherServices = serviceCatalog.filter(({ id }) => id !== service.id);
  const priceLabel = `$${service.startingPrice}/${service.priceUnit}`;

  return (
    <MarketingLayout>
      <article className="bg-slate-50 text-slate-950">
        <section className="relative overflow-hidden bg-[#070b14] pt-24 text-white">
          <div className="absolute inset-0">
            <img
              alt={page.heroAlt}
              className="size-full object-cover opacity-30"
              src={service.image}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#070b14_0%,rgba(7,11,20,0.94)_44%,rgba(7,11,20,0.55)_100%)]" />
          </div>

          <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
            <div className="max-w-3xl">
              <nav aria-label="Breadcrumb" className="mb-8">
                <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-white/45">
                  <li>
                    <Link className="hover:text-lime-200" to="/">
                      Home
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link
                      className="hover:text-lime-200"
                      hash="services"
                      to="/"
                    >
                      Services
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li className="text-lime-200">{service.shortName}</li>
                </ol>
              </nav>

              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest",
                  service.accentClassName
                )}
              >
                <Icon className="size-4" />
                {service.badge}
              </span>
              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-tight sm:text-6xl lg:text-7xl">
                {page.headline} in {centralArkansasArea}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
                {page.intro}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  search={{
                    service: service.id,
                    services: service.id,
                    step: "schedule",
                  }}
                  to="/book"
                >
                  <Button className="h-12 w-full rounded-full bg-lime-300 px-6 text-base font-bold text-slate-950 hover:bg-lime-200 sm:w-auto">
                    {page.finalCta}
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <a href="#faq">
                  <Button
                    className="h-12 w-full rounded-full border-white/15 bg-transparent px-6 text-base text-white hover:bg-white/10 sm:w-auto"
                    variant="outline"
                  >
                    Read FAQs
                  </Button>
                </a>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {page.localProof.map((item) => (
                  <div
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                    key={item}
                  >
                    <Check className="mb-2 size-4 text-lime-300" />
                    <p className="text-sm font-semibold leading-5 text-white/78">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <aside aria-label="Service quote summary">
              <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl backdrop-blur">
                <p className="text-sm font-semibold uppercase tracking-widest text-white/45">
                  Starting at
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-black">
                    ${service.startingPrice}
                  </span>
                  <span className="text-white/45">/{service.priceUnit}</span>
                </div>
                <p className="mt-3 text-sm text-emerald-300">
                  {service.subscriptionInfo}
                </p>
                <p className="mt-5 border-t border-white/10 pt-5 text-sm leading-6 text-white/58">
                  {page.bookingPrefill}
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white py-16">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-bold uppercase text-cyan-700">
                <Sparkles className="size-4" />
                Direct answer
              </span>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">
                What is CastleCare {service.shortName.toLowerCase()}?
              </h2>
            </div>
            <div className="text-lg leading-8 text-slate-700">
              <p>{page.aiAnswer}</p>
              <p className="mt-5 text-base leading-7 text-slate-600">
                {page.proofLine}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-lime-700">
                  Quote-ready details
                </p>
                <h2 className="mt-4 text-3xl font-black sm:text-4xl">
                  Everything the booking flow needs, up front.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                  CastleCare starts with the details that affect the job, so the
                  quote feels concrete before you get to checkout.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {page.quoteDetails.map((item) => (
                  <div
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    key={item}
                  >
                    <ClipboardCheck className="mb-4 size-6 text-cyan-700" />
                    <p className="text-sm font-semibold leading-6 text-slate-700">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <CalendarCheck className="mb-4 size-6 text-lime-700" />
                <h3 className="text-lg font-black">2-hour windows</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Public booking windows currently run from 6am to 8pm, with
                  appointment windows reserved in 2-hour blocks.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <CircleDollarSign className="mb-4 size-6 text-cyan-700" />
                <h3 className="text-lg font-black">Clear checkout</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {service.id === "laundry"
                    ? "Laundry-only orders collect full payment up front."
                    : "Lawn care and window washing reserve the appointment with a $50 deposit."}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <MessagesSquare className="mb-4 size-6 text-violet-700" />
                <h3 className="text-lg font-black">Status updates</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Contact details are captured early so saved quotes and service
                  updates can be followed up without making you restart.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#08111d] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-lime-300">
                  How it works
                </p>
                <h2 className="mt-4 text-3xl font-black sm:text-4xl">
                  From search to scheduled in a few focused steps.
                </h2>
                <p className="mt-4 text-base leading-7 text-white/60">
                  No account is required to start. Choose the service now and
                  CastleCare keeps the next decision visible.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {page.process.map((step, index) => (
                  <div
                    className="rounded-3xl border border-white/10 bg-white/[0.045] p-6"
                    key={step.title}
                  >
                    <span className="text-sm font-black text-lime-300">
                      0{index + 1}
                    </span>
                    <h3 className="mt-5 text-xl font-black">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/62">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-14 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
              <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <h2 className="text-2xl font-black">{page.serviceArea}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
                    {page.cityExpansionNote}
                  </p>
                </div>
                <Link
                  search={{
                    service: service.id,
                    services: service.id,
                    step: "schedule",
                  }}
                  to="/book"
                >
                  <Button className="h-12 w-full rounded-full bg-lime-300 px-6 font-bold text-slate-950 hover:bg-lime-200 md:w-auto">
                    Check my address
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-cyan-700">
                What is included
              </p>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">
                Built for the job people actually searched for.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Whether you searched for {page.primaryKeyword} or{" "}
                {page.secondaryKeyword}, the goal is the same: a clear quote, a
                reserved window, and a service path that does not waste your
                day.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {service.included.map((item) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  key={item}
                >
                  <Check className="mb-4 size-5 text-lime-700" />
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-lime-700">
                Questions people ask
              </p>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl" id="faq">
                {service.shortName} FAQs
              </h2>
            </div>

            <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
              {page.faq.map((item) => (
                <details className="group py-6" key={item.question}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-black text-slate-950">
                    {item.question}
                    <span className="text-2xl leading-none text-cyan-700 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#070b14] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <ShieldCheck className="mb-5 size-8 text-lime-300" />
                <h2 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
                  {page.finalCtaBody}
                </h2>
                <div className="mt-8">
                  <Link
                    search={{
                      service: service.id,
                      services: service.id,
                      step: "schedule",
                    }}
                    to="/book"
                  >
                    <Button className="h-12 rounded-full bg-lime-300 px-6 font-bold text-slate-950 hover:bg-lime-200">
                      {page.finalCta}
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black">Add another service</h3>
                <div className="mt-5 grid gap-3">
                  {otherServices.map((otherService) => {
                    const OtherIcon = otherService.icon;

                    return (
                      <Link
                        className="flex items-start gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-lime-300/40 hover:bg-white/[0.07]"
                        key={otherService.id}
                        params={{ serviceId: otherService.id }}
                        to="/services/$serviceId"
                      >
                        <OtherIcon className="mt-1 size-5 shrink-0 text-lime-300" />
                        <span>
                          <span className="block font-semibold text-white">
                            {otherService.shortName}
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-white/55">
                            {otherService.description}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="mt-10 text-sm text-white/45">
              Starting price shown: {priceLabel}. Final quote depends on the
              service details you provide during booking.
            </p>
          </div>
        </section>

        <section className="bg-white py-16 text-slate-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-lime-300/25 text-lime-700">
                  <Handshake className="size-6" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-lime-700">
                  Work with CastleCare
                </p>
                <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                  Want to earn by providing home services?
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  CastleCare is building an on-demand provider network for lawn
                  care, laundry pickup, and window washing. See the lanes,
                  requirements, payouts, and onboarding options built for people
                  who want flexible service work.
                </p>
              </div>
              <Link to="/earn">
                <Button className="h-12 w-full rounded-full bg-slate-950 px-6 font-bold text-white hover:bg-slate-800 lg:w-auto">
                  Start earning with CastleCare
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </article>
    </MarketingLayout>
  );
};

export const Route = createFileRoute("/services/$serviceId")({
  component: ServiceDetailPage,
  head: ({ params }) => {
    const service = getService(params.serviceId);

    if (!service) {
      return {
        meta: [{ title: "Service not found | CastleCare" }],
      };
    }

    const page = servicePageContent[service.id];
    const url = `${siteUrl}/services/${service.id}`;
    const image = getAbsoluteUrl(service.image);
    const title = `${page.headline} in ${centralArkansasArea} | CastleCare`;
    const description = `${page.serviceArea}. ${service.seoDescription}`;

    return {
      links: [{ href: url, rel: "canonical" }],
      meta: [
        { title },
        { content: description, name: "description" },
        { content: title, property: "og:title" },
        { content: description, property: "og:description" },
        { content: image, property: "og:image" },
        { content: url, property: "og:url" },
        { content: "website", property: "og:type" },
        { content: "summary_large_image", name: "twitter:card" },
        { content: title, name: "twitter:title" },
        { content: description, name: "twitter:description" },
        { content: image, name: "twitter:image" },
      ],
      scripts: [
        {
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@id": `${siteUrl}/#organization`,
                "@type": "LocalBusiness",
                areaServed: centralArkansasArea,
                image,
                name: "CastleCare",
                url: siteUrl,
              },
              {
                "@id": `${url}#service`,
                "@type": "Service",
                areaServed: {
                  "@type": "AdministrativeArea",
                  name: centralArkansasArea,
                },
                brand: {
                  "@type": "Brand",
                  name: "CastleCare",
                },
                description,
                image,
                name: service.shortName,
                offers: {
                  "@type": "Offer",
                  availability: "https://schema.org/InStock",
                  price: service.startingPrice,
                  priceCurrency: "USD",
                  url,
                },
                provider: {
                  "@id": `${siteUrl}/#organization`,
                },
                serviceType: service.shortName,
                url,
              },
              {
                "@id": `${url}#faq`,
                "@type": "FAQPage",
                mainEntity: page.faq.map((item) => ({
                  "@type": "Question",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: item.answer,
                  },
                  name: item.question,
                })),
              },
              {
                "@id": `${url}#breadcrumbs`,
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    item: siteUrl,
                    name: "Home",
                    position: 1,
                  },
                  {
                    "@type": "ListItem",
                    item: `${siteUrl}/#services`,
                    name: "Services",
                    position: 2,
                  },
                  {
                    "@type": "ListItem",
                    item: url,
                    name: service.shortName,
                    position: 3,
                  },
                ],
              },
            ],
          }),
          type: "application/ld+json",
        },
      ],
    };
  },
});
