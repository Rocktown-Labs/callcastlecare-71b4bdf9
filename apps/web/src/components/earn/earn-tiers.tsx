import { Button } from "@callcastlecare/ui/components/button";
import { CheckCircle2, ShieldCheck } from "lucide-react";

const standardTierFeatures = [
  "Express background & MVR check included ($50 one-time fee).",
  "Guaranteed route priority in your preferred zip code.",
  "Starting 60/40 payout split on day one.",
  "Bring your own equipment, earn on your schedule.",
] as const;

export default function EarnTiers() {
  return (
    <section
      className="border-t border-white/5 bg-[#080c16] py-20"
      id="requirements"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            The Economics of Performance
          </h2>
          <p className="mt-4 text-lg leading-8 text-white/60">
            One-time $50 onboarding covers express background and MVR screening.
            Start at 60/40 and earn up to an elite 80/20 split as your 5-star
            reviews grow.
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          {/* Level 1: Standard Onboarding */}
          <article className="flex flex-col rounded-3xl border border-white/10 bg-slate-950/70 p-6 lg:p-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-medium text-white/80">
                <ShieldCheck className="size-4 text-lime-300" />
                CastleCare Pro Entry
              </span>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">$50</span>
                <span className="text-white/60">one-time background check</span>
              </div>
              <p className="mt-3 text-white/60">
                Express same-day background and MVR review. Immediate route
                access.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-[#080c16] p-4">
              <div className="text-sm text-white/50">Starting payout split</div>
              <div className="mt-1 text-3xl font-bold text-white">
                60
                <span className="text-xl font-normal text-white/40"> / 40</span>
              </div>
              <div className="mt-1 text-xs text-white/50">
                60% in your pocket from job #1
              </div>
            </div>

            <ul className="mt-8 flex-1 space-y-4 text-sm">
              {standardTierFeatures.map((feature) => (
                <li
                  className="flex items-start gap-3 text-white/70"
                  key={feature}
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-lime-300" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a className="mt-8" href="#apply">
              <Button
                className="h-12 w-full rounded-full border-lime-300/30 bg-transparent text-white hover:bg-lime-300/10"
                variant="outline"
              >
                Apply & Start Onboarding
              </Button>
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
