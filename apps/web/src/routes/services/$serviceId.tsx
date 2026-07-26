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
  Check,
  LocateFixed,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import MarketingLayout from "@/components/home/marketing-layout";
import {
  centralArkansasArea,
  getService,
  serviceCatalog,
} from "@/lib/service-catalog";

const siteUrl = "https://callcastlecare.com";

const ServiceAreaStatus = () => {
  const [areaLabel, setAreaLabel] = useState(centralArkansasArea);
  const [status, setStatus] = useState("Service area ready");

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setStatus("Location is unavailable in this browser");
      return;
    }

    setStatus("Checking your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setAreaLabel(`Near ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        setStatus("We will verify exact service coverage during booking");
      },
      () => setStatus("Central Arkansas coverage shown by default"),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 }
    );
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300">
          <MapPin className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{areaLabel}</p>
          <p className="mt-1 text-xs leading-5 text-white/50">{status}</p>
          <button
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:border-lime-300/40 hover:text-lime-200"
            onClick={detectLocation}
            type="button"
          >
            <LocateFixed className="size-3.5" />
            Use my location
          </button>
        </div>
      </div>
    </div>
  );
};

const ServiceDetailPage = () => {
  const { serviceId } = useParams({ from: "/services/$serviceId" });
  const service = getService(serviceId);

  if (!service) {
    throw notFound();
  }

  const Icon = service.icon;
  const otherServices = serviceCatalog.filter(({ id }) => id !== service.id);

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden bg-[#070b14] pt-24 text-white">
        <div className="absolute inset-0">
          <img
            alt=""
            aria-hidden="true"
            className="size-full object-cover opacity-25"
            src={service.image}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b14] via-[#070b14]/90 to-[#070b14]/55" />
        </div>

        <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
          <div className="max-w-3xl">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest",
                service.accentClassName
              )}
            >
              <Icon className="size-4" />
              {service.badge}
            </span>
            <h1 className="mt-6 text-5xl font-black leading-tight sm:text-6xl">
              {service.shortName} for {centralArkansasArea}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
              {service.detailHeading} {service.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                search={{ service: service.id, services: service.id }}
                to="/book"
              >
                <Button className="h-12 w-full rounded-full bg-lime-300 px-6 text-base font-bold text-slate-950 hover:bg-lime-200 sm:w-auto">
                  Book {service.shortName.toLowerCase()}
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link hash="services" to="/">
                <Button
                  className="h-12 w-full rounded-full border-white/15 bg-transparent px-6 text-base text-white hover:bg-white/10 sm:w-auto"
                  variant="outline"
                >
                  Compare services
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <ServiceAreaStatus />
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
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-black">What is included</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Each request starts with the same guided booking wizard, then
              narrows into service-specific questions so your quote fits the
              actual job.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {service.included.map((item) => (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                key={item}
              >
                <Check className="mb-3 size-5 text-lime-600" />
                <p className="text-sm leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              "Prefills the booking wizard with this service",
              "Validates address, contact, service choices, and options",
              "Prepares Stripe checkout choices after product selection",
            ].map((item) => (
              <div
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
                key={item}
              >
                <ShieldCheck className="mb-4 size-6 text-lime-300" />
                <p className="text-sm leading-6 text-white/70">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black">Add more royal care</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {otherServices.map((otherService) => (
                <Link
                  className="rounded-2xl border border-white/10 p-4 transition-colors hover:border-lime-300/40 hover:bg-white/[0.04]"
                  key={otherService.id}
                  params={{ serviceId: otherService.id }}
                  to="/services/$serviceId"
                >
                  <p className="font-semibold text-white">
                    {otherService.shortName}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {otherService.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
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

    const url = `${siteUrl}/services/${service.id}`;

    return {
      links: [{ href: url, rel: "canonical" }],
      meta: [
        { title: `${service.shortName} in Central Arkansas | CastleCare` },
        { content: service.seoDescription, name: "description" },
        {
          content: `${service.shortName} in Central Arkansas | CastleCare`,
          property: "og:title",
        },
        { content: service.seoDescription, property: "og:description" },
        { content: service.image, property: "og:image" },
        { content: "website", property: "og:type" },
        { content: "summary_large_image", name: "twitter:card" },
      ],
      scripts: [
        {
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            areaServed: centralArkansasArea,
            brand: {
              "@type": "Brand",
              name: "CastleCare",
            },
            description: service.seoDescription,
            name: service.shortName,
            offers: {
              "@type": "Offer",
              price: service.startingPrice,
              priceCurrency: "USD",
              url,
            },
            provider: {
              "@type": "LocalBusiness",
              name: "CastleCare",
              url: siteUrl,
            },
          }),
          type: "application/ld+json",
        },
      ],
    };
  },
});
