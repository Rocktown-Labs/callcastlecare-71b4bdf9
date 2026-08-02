import {
  Outlet,
  createFileRoute,
  useRouteContext,
} from "@tanstack/react-router";

import { AppShell } from "@/components/dashboard/app-shell";

const DashboardLayout = () => {
  const { session } = useRouteContext({ from: "/_auth/dashboard" });

  return (
    <AppShell
      isAdmin={false}
      userEmail={session.data?.user.email ?? ""}
      variant="customer"
    >
      <Outlet />
    </AppShell>
  );
};

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardLayout,
});
