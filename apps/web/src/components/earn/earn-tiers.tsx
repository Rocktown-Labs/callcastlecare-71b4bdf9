import { Button } from "@callcastlecare/ui/components/button";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";

const standardFeatures = [
  "Standard onboarding timeframe while checks process.",
  "Hit quality metrics to unlock up to a 70/30 split over time.",
] as const;

const proFeatures = [
  "Express onboarding processing.",
  "Hit top metrics to unlock an elite 80/20 split.",
  "Pro status requires maintaining a high quality score.",
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
            The economics of independence
          </h2>
          <p className="mt-4 text-lg leading-8 text-white/60">
            Transparent splits reward high-quality providers. CastleCare Pro is
            a one-time upgrade for faster review, priority setup, and higher
            starting rates.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <article className="flex flex-col rounded-3xl border border-white/10 bg-slate-950/70 p-6 lg:p-8">
            <div>
              <span className="inline-block rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-medium text-white/80">
                Standard Provider
              </span>
              <div className="mt-5 text-5xl font-bold text-white">Free</div>
              <p className="mt-3 text-white/60">
                Start earning with zero upfront costs.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-[#080c16] p-4">
              <div className="text-sm text-white/50">Starting split</div>
              <div className="mt-1 text-3xl font-bold text-white">
                60
                <span className="text-xl font-normal text-white/40"> / 40</span>
              </div>
              <div className="mt-1 text-xs text-white/50">
                60% in your pocket
              </div>
            </div>

            <ul className="mt-8 flex-1 space-y-4 text-sm">
              {standardFeatures.map((feature) => (
                <li
                  className="flex items-start gap-3 text-white/70"
                  key={feature}
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-lime-300" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link className="mt-8" to="/sign-in">
              <Button
                className="h-12 w-full rounded-full border-white/15 bg-transparent text-white hover:bg-white/10"
                variant="outline"
              >
                Join for free
              </Button>
            </Link>
          </article>

          <article className="relative flex flex-col overflow-hidden rounded-3xl border border-lime-300/50 bg-lime-300/10 p-6 lg:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-lime-300" />
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/30 bg-lime-300/15 px-3 py-1 text-sm font-bold text-lime-200">
                <ShieldCheck className="size-4" />
                CastleCare Pro
              </span>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">$50</span>
                <span className="text-white/60">one-time</span>
              </div>
              <p className="mt-3 text-white/70">
                One-time onboarding upgrade for express review, priority setup,
                and Pro access.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-lime-300/30 bg-[#080c16] p-4">
              <div className="flex items-center gap-1.5 text-sm font-medium text-lime-300">
                <Zap className="size-4" />
                Instant upgrade
              </div>
              <div className="mt-1 text-3xl font-bold text-white">
                70
                <span className="text-xl font-normal text-white/40"> / 30</span>
              </div>
              <div className="mt-1 text-sm text-lime-200/80">
                Start earning more on day one
              </div>
            </div>

            <ul className="mt-8 flex-1 space-y-4 text-sm">
              {proFeatures.map((feature) => (
                <li
                  className="flex items-start gap-3 text-white/80"
                  key={feature}
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-lime-300" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link className="mt-8" to="/sign-in">
              <Button className="h-12 w-full rounded-full bg-lime-300 font-bold text-slate-950 hover:bg-lime-200">
                Apply as Pro
              </Button>
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
