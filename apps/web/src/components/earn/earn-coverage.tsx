import { Button } from "@callcastlecare/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";

const arkansasCities = [
  "Little Rock",
  "North Little Rock",
  "Conway",
  "Searcy",
  "Bentonville",
  "Fayetteville",
  "Jonesboro",
  "Fort Smith",
  "Hot Springs",
  "Pine Bluff",
  "Texarkana",
  "Cabot",
  "Bryant",
  "Maumelle",
] as const;

export default function EarnCoverage() {
  return (
    <section className="border-t border-white/5 bg-[#080c16] py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div>
          <div className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl bg-lime-300/15 text-lime-300">
            <MapPin className="size-6" />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-lime-300">
            Arkansas provider network
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Now onboarding across Arkansas
          </h2>
          <p className="mt-4 text-base leading-7 text-white/60">
            CastleCare is starting in Arkansas and building toward a national
            on-demand home service network. If you can reliably provide lawn
            care, laundry pickup, or window washing in your area, you can start
            the onboarding path now.
          </p>
          <Link className="mt-7 inline-flex" to="/sign-in">
            <Button className="h-12 rounded-full bg-lime-300 px-6 font-bold text-slate-950 hover:bg-lime-200">
              Start onboarding
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        <div className="grid content-start gap-3 sm:grid-cols-2">
          {arkansasCities.map((city) => (
            <div
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75"
              key={city}
            >
              {city}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
