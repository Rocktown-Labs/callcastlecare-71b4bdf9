import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/components/auth/auth-page";

const RouteComponent = () => (
  <AuthPage
    description="Access upcoming lawn care, laundry, and window washing appointments from one practical dashboard."
    eyebrow="Welcome back"
    title="Log in to CastleCare"
    view="signIn"
  />
);

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Log In | CastleCare",
      },
      {
        content: "Log in to manage CastleCare bookings and service updates.",
        name: "description",
      },
    ],
  }),
});
