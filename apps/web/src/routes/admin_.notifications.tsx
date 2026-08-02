import { Badge } from "@callcastlecare/ui/components/badge";
import {
  Link,
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  Headphones,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/dashboard/app-shell";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";

interface SessionPayload {
  isAdmin?: boolean;
  user?: {
    email?: string;
  };
}

interface AdminSummary {
  activeOrders: number;
  openSupport: number;
  pendingWorkers: number;
  unreadNotifications: number;
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

const AdminNotificationsRoute = () => {
  const { session } = useRouteContext({ from: "/admin_/notifications" });
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      const response = await fetch(
        new URL("/api/v1/admin/summary", getServerUrl()),
        {
          credentials: "include",
        }
      );

      if (!(active && response.ok)) {
        setIsLoading(false);
        return;
      }

      setSummary((await response.json()) as AdminSummary);
      setIsLoading(false);
    };

    const runLoadSummary = async () => {
      try {
        await loadSummary();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Notifications failed"
        );
        setIsLoading(false);
      }
    };

    void runLoadSummary();

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      href: "/admin/orders",
      icon: ReceiptText,
      label: "Active orders",
      value: summary?.activeOrders ?? 0,
    },
    {
      href: "/admin/support",
      icon: Headphones,
      label: "Open support",
      value: summary?.openSupport ?? 0,
    },
    {
      href: "/admin/staff",
      icon: UsersRound,
      label: "Provider applicants",
      value: summary?.pendingWorkers ?? 0,
    },
  ];

  return (
    <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
      <main className="px-4 py-6 text-slate-950 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6">
          <section className="grid gap-3 border-slate-200 border-b bg-white px-1 pb-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
              <Bell className="size-4" />
              Admin notifications
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              What needs attention
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Fast links for the queues that should pull an admin back into the
              app.
            </p>
          </section>

          {isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
              Loading notifications...
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-3">
            {cards.map(({ href, icon: Icon, label, value }) => (
              <Link
                className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm transition-colors hover:border-lime-300"
                key={label}
                to={href}
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon className="size-5 text-lime-600" />
                  {value > 0 ? (
                    <Badge className="bg-lime-300 text-slate-950">New</Badge>
                  ) : (
                    <Badge variant="secondary">Clear</Badge>
                  )}
                </div>
                <p className="mt-6 text-sm font-bold text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-lime-700">
                  Open route
                  <ArrowRight className="size-4" />
                </div>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </AppShell>
  );
};

export const Route = createFileRoute("/admin_/notifications")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        search: { redirectTo: "/admin/notifications" },
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
  component: AdminNotificationsRoute,
  ssr: false,
});
