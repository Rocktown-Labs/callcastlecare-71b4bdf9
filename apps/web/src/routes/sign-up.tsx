import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/components/auth/auth-page";

const RouteComponent = () => (
  <AuthPage
    description="Create an account to keep booking details, service status, and checkout preferences together."
    eyebrow="Customer account"
    title="Create your CastleCare account"
    view="signUp"
  />
);

export const Route = createFileRoute("/sign-up")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Create Account | CastleCare",
      },
      {
        content:
          "Create a CastleCare account for booking updates and customer dashboard access.",
        name: "description",
      },
    ],
  }),
});
