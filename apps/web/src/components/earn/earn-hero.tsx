import { Button } from "@callcastlecare/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, Car, Wrench } from "lucide-react";

const serviceHighlights = [
  { icon: Car, label: "Laundry delivery" },
  { icon: Wrench, label: "Lawn care pros" },
  { icon: Briefcase, label: "Window washing" },
] as const;

export default function EarnHero() {
  return (
    <section className="w-full bg-[#080c16]">
      <div className="mx-auto grid min-h-[calc(100svh-49px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-8">
        <div className="max-w-3xl space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-sm font-medium text-lime-300">
              <span className="mr-2 size-2 rounded-full bg-lime-400" />
              Now onboarding providers
            </div>
            <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-7xl">
              Work when you want.
              <span className="block text-lime-300">Earn like royalty.</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-white/65">
              Join the CastleCare provider network for lawn care, laundry
              pickup, and window washing on your schedule. Keep up to{" "}
              <span className="font-semibold text-lime-300">80%</span> of what
              you earn as we build on-demand home services city by city.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/login">
              <Button
                className="h-12 rounded-full bg-lime-300 px-6 text-sm font-semibold text-slate-950 hover:bg-lime-200"
                size="lg"
              >
                Start earning today
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <a href="#requirements">
              <Button
                className="h-12 rounded-full border-white/20 bg-transparent px-6 text-sm text-white hover:bg-white/10"
                size="lg"
                variant="outline"
              >
                View requirements
              </Button>
            </a>
          </div>

          <div className="grid gap-3 pt-2 text-sm text-white/60 sm:grid-cols-3">
            {serviceHighlights.map(({ icon: Icon, label }) => (
              <div className="flex items-center gap-2" key={label}>
                <Icon className="size-5 text-lime-300" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <figure className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-slate-950/40 md:min-h-[520px]">
          <img
            alt="CastleCare provider standing by a service van"
            className="absolute inset-0 size-full object-cover"
            src="/callcastlecare/media/technician-van-night.png"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080c16] via-[#080c16]/25 to-transparent" />
          <figcaption className="absolute inset-x-0 bottom-0 space-y-3 p-6">
            <blockquote className="max-w-lg text-2xl font-bold text-white">
              I control my schedule and make strong money on my own terms.
            </blockquote>
            <p className="font-medium text-lime-300">Sam T., CastleCare Pro</p>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
