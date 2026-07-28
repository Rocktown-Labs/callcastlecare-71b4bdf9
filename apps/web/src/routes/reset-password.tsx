import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/components/auth/auth-page";

const RouteComponent = () => (
  <AuthPage
    description="Choose a new password for your CastleCare customer account."
    eyebrow="Account recovery"
    title="Set a new password"
    view="resetPassword"
  />
);

export const Route = createFileRoute("/reset-password")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Set New Password | CastleCare",
      },
    ],
  }),
});
