import type { AuthView } from "@better-auth-ui/core";
import { Link } from "@tanstack/react-router";
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
  "$50 deposit checkout stays attached to your account",
  "Google sign-in or email and password",
] as const;

export const AuthPage = ({
  description,
  eyebrow,
  title,
  view,
}: AuthPageProps) => (
  <main className="grid min-h-svh bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
    <section className="relative hidden min-h-svh overflow-hidden lg:block">
      <img
        alt="CastleCare technician arriving for a home service visit"
        className="absolute inset-0 size-full object-cover"
        src="/callcastlecare/media/technician-van-night.png"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/45 to-black/20" />
      <div className="relative flex min-h-svh flex-col justify-between p-10 text-white">
        <Link className="flex items-center gap-3 font-semibold" to="/">
          <img
            alt=""
            className="size-10 rounded-md"
            src="/callcastlecare/brand/logo-square-192.png"
          />
          CastleCare
        </Link>

        <div className="max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1 text-sm text-white/85">
            <Sparkles aria-hidden="true" className="size-4" />
            Private beta customer dashboard
          </p>
          <h1 className="text-5xl font-semibold leading-tight">{title}</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/78">
            {description}
          </p>
        </div>

        <div className="grid gap-3">
          {highlights.map((highlight) => (
            <div
              className="flex items-center gap-3 rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/85"
              key={highlight}
            >
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {highlight}
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="flex min-h-svh flex-col px-5 py-6 sm:px-8 lg:px-10">
      <nav className="flex items-center justify-between">
        <Link className="flex items-center gap-3 font-semibold" to="/">
          <img
            alt=""
            className="size-9 rounded-md"
            src="/callcastlecare/brand/logo-square-192.png"
          />
          CastleCare
        </Link>
        <Link
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
          to="/book"
        >
          Book first
        </Link>
      </nav>

      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="size-4" />
              {eyebrow}
            </p>
            <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>

          <Auth
            className="max-w-sm border-border/70 shadow-sm"
            socialPosition="top"
            view={view}
          />
        </div>
      </div>
    </section>
  </main>
);
