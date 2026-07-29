import {
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";
import { AdminDashboard } from "@/routes/_auth/dashboard";

interface SessionPayload {
  isAdmin?: boolean;
  user?: {
    email?: string;
  };
}

const getAdminSession = async () => {
  const response = await fetch(new URL("/api/v1/me", getServerUrl()), {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SessionPayload;
};

const RouteComponent = () => {
  const { session } = useRouteContext({ from: "/admin" });
  return <AdminDashboard userEmail={session.user?.email ?? ""} />;
};

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        search: { redirectTo: "/admin" },
        to: "/sign-in",
      });
    }

    const adminSession = await getAdminSession();
    if (!adminSession?.isAdmin) {
      throw redirect({
        to: "/dashboard",
      });
    }

    return { session: adminSession };
  },
  component: RouteComponent,
  ssr: false,
});
