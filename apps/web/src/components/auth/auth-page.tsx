import type { AuthView } from "@better-auth-ui/core";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import { Auth } from "@/components/auth/auth";

interface AuthPageProps {
  eyebrow: string;
  title: string;
  description: string;
  view: AuthView;
}

const highlights = [
  "Manage bookings and visit status",
  "Deposit and checkout preferences stay attached",
  "Google sign-in or secure email access",
] as const;

export const AuthPage = ({
  description,
  eyebrow,
  title,
  view,
}: AuthPageProps) => (
  <main className="grid min-h-svh bg-[#070b13] text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(440px,540px)]">
    <section className="relative hidden min-h-svh overflow-hidden lg:block">
      <Image
        alt="CastleCare technician arriving for a home service visit"
        className="absolute inset-0 size-full object-cover"
        layout="fullWidth"
        priority
        src="/callcastlecare/media/technician-van-night.png"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/55 to-black/20" />
      <div className="relative flex min-h-svh flex-col justify-end gap-12 p-10 text-white">
        <div className="max-w-xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm text-white/85 shadow-2xl shadow-black/20 backdrop-blur">
            <Sparkles aria-hidden="true" className="size-4" />
            Private beta customer dashboard
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-normal">
            {title}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/78">
            {description}
          </p>
        </div>

        <div className="grid gap-3">
          {highlights.map((highlight) => (
            <div
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/85 shadow-xl shadow-black/10 backdrop-blur"
              key={highlight}
            >
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {highlight}
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="relative flex min-h-svh flex-col overflow-hidden px-5 py-6 sm:px-8 lg:px-10">
      <div className="absolute inset-0 lg:hidden">
        <Image
          alt=""
          aria-hidden="true"
          className="size-full object-cover opacity-30"
          layout="fullWidth"
          priority
          src="/callcastlecare/media/technician-van-night.png"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b13]/75 via-[#070b13]/95 to-[#070b13]" />
      </div>
      <nav className="flex items-center justify-end">
        <Link
          className="relative z-10 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          to="/book"
        >
          Book first
        </Link>
      </nav>

      <div className="relative z-10 flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[25rem]">
          <div className="mb-6">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-sm font-medium text-lime-200">
              <ShieldCheck aria-hidden="true" className="size-4" />
              {eyebrow}
            </p>
            <h1 className="text-3xl font-semibold tracking-normal text-white">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/64">
              {description}
            </p>
          </div>

          <Auth
            className="max-w-[25rem] rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/35 backdrop-blur"
            socialPosition="top"
            view={view}
          />
        </div>
      </div>
    </section>
  </main>
);
