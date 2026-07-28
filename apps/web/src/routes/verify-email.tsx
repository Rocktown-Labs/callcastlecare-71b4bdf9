import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/components/auth/auth-page";

const RouteComponent = () => (
  <AuthPage
    description="Confirm your email address to finish setting up CastleCare."
    eyebrow="Email verification"
    title="Verify your email"
    view="verifyEmail"
  />
);

export const Route = createFileRoute("/verify-email")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Verify Email | CastleCare",
      },
    ],
  }),
});
