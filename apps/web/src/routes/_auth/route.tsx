import {
  Outlet,
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";

import { AppShell } from "@/components/dashboard/app-shell";
import { authClient } from "@/lib/auth-client";

const AuthLayout = () => {
  const { session } = useRouteContext({ from: "/_auth" });
  const user = session.data?.user;
  const isAdmin = Boolean(user && "role" in user && user.role === "admin");

  return (
    <AppShell
      isAdmin={isAdmin}
      userEmail={user?.email ?? ""}
      variant="customer"
    >
      <Outlet />
    </AppShell>
  );
};

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        search: { redirectTo: location.href },
        to: "/sign-in",
      });
    }
    return { session };
  },
  component: AuthLayout,
  ssr: false,
});
