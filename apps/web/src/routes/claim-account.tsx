import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { z } from "zod";

import { EmailOtpSignIn } from "@/components/auth/email-otp-sign-in";

const searchSchema = z.object({
  email: z.string().email().optional(),
});

const RouteComponent = () => {
  const search = useSearch({ from: "/claim-account" });

  return (
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
              Customer dashboard access
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-normal">
              Claim the account tied to your booking.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/78">
              Use the same email from checkout to view appointment status,
              invoices, service photos, and follow-up notes.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              "No password required for first access",
              "Your booking email becomes your customer login",
              "Dashboard access is ready for future service history",
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

        <div className="relative z-10 flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[25rem]">
            <div className="mb-6">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-sm font-medium text-lime-200">
                <ShieldCheck aria-hidden="true" className="size-4" />
                Secure claim
              </p>
              <h1 className="text-3xl font-semibold tracking-normal text-white">
                Access your CastleCare account
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/64">
                We will send a one-time code to verify this is your inbox.
              </p>
            </div>

            <EmailOtpSignIn
              className="max-w-[25rem] rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/35 backdrop-blur"
              description="Use the email from checkout to continue into your customer dashboard."
              email={search.email}
              title="Claim with email code"
            />
          </div>
        </div>
      </section>
    </main>
  );
};

export const Route = createFileRoute("/claim-account")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Claim Account | CastleCare",
      },
      {
        content:
          "Claim your CastleCare customer account with a one-time email code after checkout.",
        name: "description",
      },
    ],
  }),
  validateSearch: searchSchema,
});
