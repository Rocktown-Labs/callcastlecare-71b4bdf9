import { Button } from "@callcastlecare/ui/components/button";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  RadioTower,
} from "lucide-react";

const onboardingSteps = [
  {
    description:
      "Tell us your service lane, Arkansas location, tools, transportation, and availability.",
    icon: ClipboardList,
    title: "Apply",
  },
  {
    description:
      "CastleCare reviews your details and confirms the right starting path for your lane.",
    icon: BadgeCheck,
    title: "Verify",
  },
  {
    description:
      "Once approved, accept service work as customer demand opens in your area.",
    icon: RadioTower,
    title: "Go live",
  },
] as const;

export default function EarnOnboarding() {
  return (
    <section className="bg-[#080c16] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-lime-300">
            Provider onboarding
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            How onboarding works
          </h2>
          <p className="mt-4 text-base leading-7 text-white/60">
            The goal is simple: match reliable providers with the right service
            lane, then open work as local demand is ready.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {onboardingSteps.map(({ description, icon: Icon, title }) => (
            <article
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
              key={title}
            >
              <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-lime-300">
                <Icon className="size-6" />
              </div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                {description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/sign-in">
            <Button className="h-12 rounded-full bg-lime-300 px-6 font-bold text-slate-950 hover:bg-lime-200">
              Start my provider application
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
