import { Outlet, createFileRoute } from "@tanstack/react-router";

const DashboardLayout = () => {
  return <Outlet />;
};

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardLayout,
});
