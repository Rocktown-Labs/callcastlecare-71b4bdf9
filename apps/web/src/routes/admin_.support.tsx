import { Button } from "@callcastlecare/ui/components/button";
import {
  Link,
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";
import { ArrowRight, Headphones, Inbox } from "lucide-react";
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

interface SupportRequest {
  addressText?: string | null;
  city?: string | null;
  createdAt: string;
  email: string;
  id: number;
  message: string;
  name: string;
  orderId?: number | null;
  orderNumber?: string | null;
  phone?: string | null;
  requestType: string;
  serviceType?: string | null;
  state?: string | null;
  status: string;
  zip?: string | null;
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

const AdminSupportRoute = () => {
  const { session } = useRouteContext({ from: "/admin_/support" });
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSupport = async () => {
      setIsLoading(true);
      const response = await fetch(
        new URL("/api/v1/admin/support", getServerUrl()),
        {
          credentials: "include",
        }
      );

      if (!active) {
        return;
      }

      if (response.ok) {
        const payload = (await response.json()) as {
          requests?: SupportRequest[];
        };
        setRequests(payload.requests ?? []);
      }

      setIsLoading(false);
    };

    const runLoadSupport = async () => {
      try {
        await loadSupport();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Support failed");
        setIsLoading(false);
      }
    };

    void runLoadSupport();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
      <main className="px-4 py-6 text-slate-950 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6">
          <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                <Headphones className="size-4" />
                Admin support
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Support queue
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Customer dashboard, help center, and service-area requests show
                here with order context when available.
              </p>
            </div>
            <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
              {requests.length} latest
            </div>
          </section>

          <section className="grid gap-4">
            {isLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
                Loading support...
              </div>
            ) : null}
            {!isLoading && requests.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <Inbox className="mx-auto size-8 text-lime-600" />
                <h2 className="mt-3 text-xl font-black">No support yet</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Messages from customer dashboards and public support forms
                  will appear here.
                </p>
                <Link to="/admin/orders">
                  <Button
                    className="mt-5 rounded-full border-slate-200"
                    type="button"
                    variant="outline"
                  >
                    Check orders
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            ) : null}
            {requests.map((request) => (
              <article
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                key={request.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                        {request.requestType.replaceAll("_", " ")}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {request.status}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-black">{request.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {request.email}
                      {request.phone ? ` · ${request.phone}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-500">
                    {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700">
                  {request.message}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  {request.orderId ? (
                    <Link
                      className="rounded-full bg-slate-100 px-3 py-1 text-slate-700"
                      params={{ orderId: String(request.orderId) }}
                      to="/admin/orders/$orderId"
                    >
                      Order #{request.orderId}
                    </Link>
                  ) : null}
                  {request.orderNumber ? (
                    <span>Ref {request.orderNumber}</span>
                  ) : null}
                  {request.serviceType ? (
                    <span>{request.serviceType.replaceAll("_", " ")}</span>
                  ) : null}
                  {request.addressText ? (
                    <span>
                      {[
                        request.addressText,
                        request.city,
                        request.state,
                        request.zip,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>
    </AppShell>
  );
};

export const Route = createFileRoute("/admin_/support")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        search: { redirectTo: "/admin/support" },
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
  component: AdminSupportRoute,
  ssr: false,
});
