import { Button } from "@callcastlecare/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Car, Check, Smartphone, WalletCards } from "lucide-react";

const requirements = [
  { icon: Car, label: "Reliable vehicle" },
  { icon: Smartphone, label: "Cell phone" },
  { icon: Check, label: "Ready to do quality work" },
] as const;

export default function EarnCtaSection() {
  return (
    <section className="bg-white px-4 py-20 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-xl shadow-slate-200/60 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:p-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-lime-700">
            Now onboarding providers
          </span>
          <h2 className="mt-5 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">
            Want to earn with CastleCare after each completed job?
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Bring the basics, choose the jobs that fit your schedule, and help
            us build a faster home-service network across Arkansas.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to="/earn">
              <Button className="h-12 w-full rounded-full bg-lime-300 px-6 font-bold text-slate-950 hover:bg-lime-200 sm:w-auto">
                Start earning
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <WalletCards className="size-6 text-lime-600" />
            <p className="mt-3 text-lg font-black text-slate-950">
              Payment after every job completion
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              CastleCare is being built for on-demand work with clear job
              details, clean expectations, and fast provider payouts.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {requirements.map(({ icon: Icon, label }) => (
              <div
                className="rounded-3xl border border-slate-200 bg-white p-4"
                key={label}
              >
                <Icon className="size-5 text-lime-600" />
                <p className="mt-3 text-sm font-bold text-slate-700">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
