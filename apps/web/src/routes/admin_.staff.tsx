import { Button } from "@callcastlecare/ui/components/button";
import {
  Link,
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardCheck,
  Inbox,
  Mail,
  Phone,
  RouteIcon,
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

interface WorkerApplication {
  applicationFormData?: unknown;
  createdAt: string;
  email: string;
  firstName: string;
  id: number;
  isActive: boolean;
  lastName: string;
  onboardingStatus: string;
  phone: string;
  serviceRadiusMiles: number;
  servicesOffered: string[];
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

const AdminStaffRoute = () => {
  const { session } = useRouteContext({ from: "/admin_/staff" });
  const [workers, setWorkers] = useState<WorkerApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadWorkers = async () => {
      const response = await fetch(
        new URL("/api/v1/admin/workers", getServerUrl()),
        {
          credentials: "include",
        }
      );

      if (!(active && response.ok)) {
        setIsLoading(false);
        return;
      }

      const payload = (await response.json()) as {
        workers?: WorkerApplication[];
      };
      setWorkers(payload.workers ?? []);
      setIsLoading(false);
    };

    const runLoadWorkers = async () => {
      try {
        await loadWorkers();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Staff failed");
        setIsLoading(false);
      }
    };

    void runLoadWorkers();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell isAdmin userEmail={session.user?.email ?? ""} variant="admin">
      <main className="px-4 py-6 text-slate-950 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6">
          <section className="grid gap-5 border-slate-200 border-b bg-white px-1 pb-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                <UsersRound className="size-4" />
                Staff workspace
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Provider applicants
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                See who signed up from the earn route, then use order detail
                screens for the field workflow while provider review matures.
              </p>
            </div>
            <Link to="/admin/orders">
              <Button
                className="h-11 rounded-full bg-lime-300 px-5 font-bold text-slate-950 hover:bg-lime-200"
                type="button"
              >
                Open job queue
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Earn signups</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Applicants created from provider onboarding will show here.
                  </p>
                </div>
                <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
                  {workers.length} total
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {isLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center font-bold text-slate-500">
                    Loading applicants...
                  </div>
                ) : null}
                {!isLoading && workers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center">
                    <Inbox className="mx-auto size-7 text-lime-600" />
                    <h3 className="mt-3 font-black">No provider signups yet</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Once the earn form persists applications, every applicant
                      lands here for admin review.
                    </p>
                  </div>
                ) : null}
                {workers.map((worker) => (
                  <div
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    key={worker.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black">
                            {worker.firstName} {worker.lastName}
                          </h3>
                          <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                            {worker.onboardingStatus}
                          </span>
                        </div>
                        <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="size-4 text-lime-600" />
                          {worker.email}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="size-4 text-lime-600" />
                          {worker.phone}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-500">
                        {new Date(worker.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      {worker.servicesOffered.map((service) => (
                        <span
                          className="rounded-full bg-white px-3 py-1"
                          key={service}
                        >
                          {service.replace("-", " ")}
                        </span>
                      ))}
                      <span className="rounded-full bg-white px-3 py-1">
                        {worker.serviceRadiusMiles} mi radius
                      </span>
                      <span className="rounded-full bg-white px-3 py-1">
                        {worker.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <ClipboardCheck className="size-6 text-lime-600" />
              <h2 className="mt-4 text-xl font-black">Job action screen</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Open any admin order to confirm, mark arrival, upload before
                photos, start work, upload after photos, and complete the job.
              </p>
              <Link to="/admin/orders">
                <Button
                  className="mt-5 rounded-full border-slate-200"
                  type="button"
                  variant="outline"
                >
                  View orders
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-4">
                <RouteIcon className="size-5 text-lime-600" />
                <h3 className="mt-3 font-black">Dispatch routes</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Route sheets and staff assignment can attach here after
                  provider review starts approving workers.
                </p>
              </div>
            </article>
          </section>
        </div>
      </main>
    </AppShell>
  );
};

export const Route = createFileRoute("/admin_/staff")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        search: { redirectTo: "/admin/staff" },
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
  component: AdminStaffRoute,
  ssr: false,
});
