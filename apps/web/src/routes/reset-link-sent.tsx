import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/components/auth/auth-page";

const RouteComponent = () => (
  <AuthPage
    description="Open the email we sent to continue resetting your password."
    eyebrow="Account recovery"
    title="Check your email"
    view="resetLinkSent"
  />
);

export const Route = createFileRoute("/reset-link-sent")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Check Your Email | CastleCare",
      },
    ],
  }),
});
