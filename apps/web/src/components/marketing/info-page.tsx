import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import MarketingLayout from "@/components/home/marketing-layout";

interface InfoPageProps {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

export const InfoPage = ({
  children,
  description,
  eyebrow,
  title,
}: InfoPageProps) => (
  <MarketingLayout>
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-[#080c16] px-4 pb-16 pt-32 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="inline-flex rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-sm font-black uppercase tracking-[0.18em] text-lime-200">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
            {description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-lime-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-lime-200"
              to="/book"
            >
              Start a quote
            </Link>
            <Link
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/80 hover:bg-white/10"
              to="/help"
            >
              Get help
            </Link>
          </div>
        </div>
      </section>
      {children}
    </main>
  </MarketingLayout>
);
