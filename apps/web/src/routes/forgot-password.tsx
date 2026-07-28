import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/components/auth/auth-page";

const RouteComponent = () => (
  <AuthPage
    description="Request a password reset link for the customer dashboard."
    eyebrow="Account recovery"
    title="Reset your password"
    view="forgotPassword"
  />
);

export const Route = createFileRoute("/forgot-password")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Reset Password | CastleCare",
      },
    ],
  }),
});
