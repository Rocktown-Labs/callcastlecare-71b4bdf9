import { Clock, DollarSign, Smartphone, TrendingUp } from "lucide-react";

const benefits = [
  {
    color: "text-lime-300",
    description:
      "Work when it makes sense for you. No rigid schedules, just opportunities you can accept when the app is on.",
    icon: Clock,
    title: "Be your own boss",
  },
  {
    color: "text-sky-300",
    description:
      "Start at 60% and scale up to 80% as a CastleCare Pro. The people doing the work should keep the most.",
    icon: DollarSign,
    title: "Keep more of your money",
  },
  {
    color: "text-violet-300",
    description:
      "For laundry, CastleCare supplies custom bags. You bring a car, a connected smartphone, and reliable service.",
    icon: Smartphone,
    title: "Low-friction setup",
  },
  {
    color: "text-amber-300",
    description:
      "Quality metrics unlock better opportunities, higher payouts, and Pro status as the network grows.",
    icon: TrendingUp,
    title: "Built for growth",
  },
] as const;

export default function EarnBenefits() {
  return (
    <section className="border-y border-white/5 bg-[#080c16] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Why provide services with CastleCare?
          </h2>
          <p className="mt-4 text-lg leading-8 text-white/55">
            We are building a network that respects your time, values your
            effort, and pays you what you are worth.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ color, description, icon: Icon, title }) => (
            <article
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-lime-300/40"
              key={title}
            >
              <div className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950">
                <Icon className={`size-6 ${color}`} />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
