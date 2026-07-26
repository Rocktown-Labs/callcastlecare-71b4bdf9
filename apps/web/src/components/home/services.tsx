import { Button } from "@callcastlecare/ui/components/button";
import { cn } from "@callcastlecare/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Crown, ShieldCheck, Sparkles } from "lucide-react";

import { serviceCatalog } from "@/lib/service-catalog";

export default function ServicesSection() {
  return (
    <section
      className="relative w-full overflow-hidden bg-white py-24 text-slate-950"
      id="services"
    >
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-lime-600/20 bg-lime-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-lime-700">
            <Crown className="size-3.5" />
            Royal Home Care
          </span>
          <h2 className="mb-4 text-pretty text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            One app for the jobs that keep life moving
          </h2>
          <p className="text-lg leading-8 text-slate-600">
            Transparent pricing, guided estimates, and instant booking for homes
            across Central Arkansas.
          </p>
        </div>

        <div className="mb-8 grid gap-3 md:grid-cols-3">
          {["Vetted local pros", "Status updates", "Clear booking flow"].map(
            (item) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                key={item}
              >
                <ShieldCheck className="size-4 text-lime-600" />
                {item}
              </div>
            )
          )}
        </div>

        <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-3">
          {serviceCatalog.map((service) => {
            const Icon = service.icon;

            return (
              <article
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 transition-transform duration-300 hover:-translate-y-1.5",
                  service.id === "laundry" &&
                    "border-sky-300 ring-1 ring-sky-200"
                )}
                key={service.id}
              >
                {service.id === "laundry" ? (
                  <div className="absolute right-0 top-0 rounded-bl-xl bg-sky-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950">
                    Most Popular
                  </div>
                ) : null}

                <div className="p-6">
                  <div className="mb-5 flex items-start gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-inner">
                      <Icon className="size-6 text-current" />
                    </div>
                    <div>
                      <span
                        className={cn(
                          "mb-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                          service.accentClassName
                        )}
                      >
                        {service.badge}
                      </span>
                      <h3 className="text-xl font-bold leading-tight text-slate-950">
                        {service.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-slate-600">
                    {service.description}
                  </p>
                </div>

                <div className="mx-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-xs font-semibold text-slate-500">
                      Starting at
                    </span>
                    <span className="ml-1.5 text-3xl font-black text-slate-950">
                      ${service.startingPrice}
                    </span>
                    <span className="text-xs text-slate-500">
                      /{service.priceUnit}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center justify-center gap-1 text-center text-xs font-semibold text-emerald-600">
                    <Sparkles className="size-3" />
                    {service.subscriptionInfo}
                  </p>
                </div>

                <ul className="grow space-y-2.5 p-6 text-sm">
                  {service.features.map((feature) => (
                    <li className="flex items-start gap-2.5" key={feature}>
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                      <span className="leading-normal text-slate-700">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-slate-100 p-6 pt-0">
                  <Link
                    params={{ serviceId: service.id }}
                    to="/services/$serviceId"
                  >
                    <Button className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-bold text-white shadow-md hover:bg-slate-800">
                      {service.ctaText}
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
