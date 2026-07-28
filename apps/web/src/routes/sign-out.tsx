import { createFileRoute } from "@tanstack/react-router";

import { Auth } from "@/components/auth/auth";

const RouteComponent = () => (
  <main className="flex min-h-svh items-center justify-center bg-background p-6">
    <Auth view="signOut" />
  </main>
);

export const Route = createFileRoute("/sign-out")({
  component: RouteComponent,
});
