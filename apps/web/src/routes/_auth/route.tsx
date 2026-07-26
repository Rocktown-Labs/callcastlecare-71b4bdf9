import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import Header from "@/components/header";
import { authClient } from "@/lib/auth-client";

const AuthLayout = () => (
  <div className="grid min-h-svh grid-rows-[auto_1fr]">
    <Header />
    <Outlet />
  </div>
);

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/login",
      });
    }
    return { session };
  },
  component: AuthLayout,
  ssr: false,
});
