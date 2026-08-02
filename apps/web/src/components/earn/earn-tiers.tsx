import { Button } from "@callcastlecare/ui/components/button";
import { Award, CheckCircle2, ShieldCheck, Sparkles, Zap } from "lucide-react";

const standardTierFeatures = [
  "Express background & MVR check included ($50 one-time fee).",
  "Guaranteed route priority in your preferred zip code.",
  "Starting 60/40 payout split on day one.",
  "Bring your own equipment, earn on your schedule.",
] as const;

const proTierFeatures = [
  "Gold Pro (70/30 split): Unlock after 25 jobs & 4.7★ rating.",
  "Elite Pro (80/20 split): Unlock after 75 jobs & 4.9★ rating.",
  "Priority route blocks (Amazon Flex style neighborhood clustering).",
  "Monthly performance bonuses & top provider badges.",
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

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
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

          {/* Level 2 & 3: Gold & Elite Tiers */}
          <article className="relative flex flex-col overflow-hidden rounded-3xl border border-lime-300/50 bg-lime-300/10 p-6 lg:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-lime-300" />
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/30 bg-lime-300/15 px-3 py-1 text-sm font-bold text-lime-200">
                <Sparkles className="size-4 text-lime-300" />
                Performance Progression Tiers
              </span>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">70% – 80%</span>
                <span className="text-white/60">unlocked</span>
              </div>
              <p className="mt-3 text-white/70">
                Earn 5-star customer ratings to permanently upgrade your payout
                splits.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 rounded-2xl border border-lime-300/30 bg-[#080c16] p-4">
              <div>
                <div className="flex items-center gap-1 text-xs font-semibold text-lime-300">
                  <Award className="size-3.5" />
                  Gold Pro
                </div>
                <div className="mt-0.5 text-2xl font-bold text-white">
                  70 / 30
                </div>
                <div className="text-[11px] text-white/50">25 jobs & 4.7★</div>
              </div>
              <div className="border-l border-white/10 pl-3">
                <div className="flex items-center gap-1 text-xs font-semibold text-lime-300">
                  <Zap className="size-3.5" />
                  Elite Pro
                </div>
                <div className="mt-0.5 text-2xl font-bold text-white">
                  80 / 20
                </div>
                <div className="text-[11px] text-white/50">75 jobs & 4.9★</div>
              </div>
            </div>

            <ul className="mt-8 flex-1 space-y-4 text-sm">
              {proTierFeatures.map((feature) => (
                <li
                  className="flex items-start gap-3 text-white/80"
                  key={feature}
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-lime-300" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a className="mt-8" href="#apply">
              <Button className="h-12 w-full rounded-full bg-lime-300 font-bold text-slate-950 hover:bg-lime-200">
                Unlock Elite Splits
              </Button>
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
