import { createFileRoute, useSearch } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { z } from "zod";

import { ResetPasswordOtp } from "@/components/auth/reset-password-otp";

const searchSchema = z.object({
  email: z.string().email().optional(),
});

const RouteComponent = () => {
  const search = useSearch({ from: "/reset-password-otp" });

  return (
    <main className="grid min-h-svh bg-[#070b13] text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(440px,540px)]">
      <section className="relative hidden min-h-svh overflow-hidden lg:block">
        <img
          alt="CastleCare technician arriving for a home service visit"
          className="absolute inset-0 size-full object-cover"
          src="/callcastlecare/media/technician-van-night.png"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/55 to-black/20" />
        <div className="relative flex min-h-svh flex-col justify-end gap-12 p-10 text-white">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm text-white/85 shadow-2xl shadow-black/20 backdrop-blur">
              <Sparkles aria-hidden="true" className="size-4" />
              Password recovery
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-normal">
              Reset your password without waiting on a link.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/78">
              The email code flow keeps account recovery fast on mobile while
              still protecting bookings, invoices, and service history.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              "Six-digit code with copy-paste support",
              "Password updates revoke older sessions",
              "Back to the customer dashboard once you sign in",
            ].map((highlight) => (
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
          <img
            alt=""
            aria-hidden="true"
            className="size-full object-cover opacity-30"
            src="/callcastlecare/media/technician-van-night.png"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070b13]/75 via-[#070b13]/95 to-[#070b13]" />
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[25rem]">
            <div className="mb-6">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-sm font-medium text-lime-200">
                <ShieldCheck aria-hidden="true" className="size-4" />
                Secure reset
              </p>
              <h1 className="text-3xl font-semibold tracking-normal text-white">
                Reset by email code
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/64">
                Enter your email first, then use the code we send to set a new
                password.
              </p>
            </div>

            <ResetPasswordOtp
              className="max-w-[25rem] rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/35 backdrop-blur"
              email={search.email}
            />
          </div>
        </div>
      </section>
    </main>
  );
};

export const Route = createFileRoute("/reset-password-otp")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Reset Password With Code | CastleCare",
      },
      {
        content: "Reset your CastleCare password with a one-time email code.",
        name: "description",
      },
    ],
  }),
  validateSearch: searchSchema,
});
