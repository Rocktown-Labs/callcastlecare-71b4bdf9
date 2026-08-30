import { Badge } from "@callcastlecare/ui/components/badge";
import { Button } from "@callcastlecare/ui/components/button";
import {
  createFileRoute,
  Link,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  Mail,
  Phone,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/dashboard/app-shell";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";

interface SessionPayload {
  isAdmin: boolean;
  user: {
    email: string;
    id: string;
    name: string;
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

interface WorkerRecord {
  applicationFormData?: Record<string, unknown> | null;
  createdAt: string;
  email: string;
  firstName: string;
  id: number;
  lastName: string;
  onboardingStatus: string;
  phone: string;
  serviceRadiusMiles: number;
  servicesOffered: string[];
}

const mockApplicants: WorkerRecord[] = [
  {
    applicationFormData: { plan: "pro" },
    createdAt: "2026-08-02T18:00:00Z",
    email: "marcus.pro@castlecare.com",
    firstName: "Marcus",
    id: 1,
    lastName: "Vance",
    onboardingStatus: "express_submitted",
    phone: "(501) 555-0144",
    serviceRadiusMiles: 20,
    servicesOffered: ["lawncare", "window_washing"],
  },
  {
    applicationFormData: { plan: "pro" },
    createdAt: "2026-08-01T12:30:00Z",
    email: "sarah.j@castlecare.com",
    firstName: "Sarah",
    id: 2,
    lastName: "Jenkins",
    onboardingStatus: "approved",
    phone: "(501) 555-0188",
    serviceRadiusMiles: 15,
    servicesOffered: ["laundry"],
  },
];

const AdminStaffRoute = () => {
  const { session } = useRouteContext({ from: "/admin_/staff" });
  const [workers, setWorkers] = useState<WorkerRecord[]>(mockApplicants);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadStaff = async () => {
      const response = await fetch(
        new URL("/api/v1/admin/workers", getServerUrl()),
        { credentials: "include" }
      );
      if (!(active && response.ok)) {
        setIsLoading(false);
        return;
      }
      const payload = (await response.json()) as { workers?: WorkerRecord[] };
      if (payload.workers && payload.workers.length > 0) {
        setWorkers(payload.workers);
      }
      setIsLoading(false);
    };

    void loadStaff();

    return () => {
      active = false;
    };
  }, []);

  const approveWorker = async (workerId: number) => {
    const response = await fetch(
      new URL(`/api/v1/admin/workers/${workerId}/approve`, getServerUrl()),
      {
        credentials: "include",
        method: "POST",
      }
    );
    if (!response.ok) {
      toast.error("Provider approval could not be saved.");
      return;
    }

    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId
          ? { ...worker, onboardingStatus: "approved" }
          : worker
      )
    );
    toast.success("Provider approved. Connect onboarding is now available.");
  };

  return (
    <AppShell
      isAdmin
      userEmail={
        (session as { user?: { email?: string } })?.user?.email ??
        "admin@callcastlecare.com"
      }
      variant="admin"
    >
      <main className="px-4 py-6 text-slate-950 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6">
          <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
                <UsersRound className="size-4" />
                Staff & Provider Onboarding
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Field Network Roster
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Review CastleCare Pro applicants, manage background & MVR check
                verifications, and activate 60/40–80/20 provider route access.
              </p>
            </div>
            <Link to="/admin/orders">
              <Button
                className="h-11 rounded-full bg-lime-300 px-5 font-bold text-slate-950 hover:bg-lime-200"
                type="button"
              >
                Dispatch queue
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </section>

          {/* Applicant Roster Table */}
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Provider Applicants
                </h2>
                <p className="text-xs text-slate-500">
                  Applicants with $50 Express Onboarding background check
                  verification.
                </p>
              </div>
              <Badge className="bg-slate-950 text-white font-bold">
                {workers.length} Applicants
              </Badge>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Applicant Name</th>
                    <th className="px-4 py-3">Contact Email & Phone</th>
                    <th className="px-4 py-3">Services Offered</th>
                    <th className="px-4 py-3">Onboarding Status</th>
                    <th className="px-4 py-3">Date Applied</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workers.map((worker) => (
                    <tr
                      className="transition-colors hover:bg-slate-50/70"
                      key={worker.id}
                    >
                      <td className="px-4 py-4 font-black text-slate-950">
                        <div className="flex items-center gap-2">
                          <UserCheck className="size-4 text-lime-600" />
                          {worker.firstName} {worker.lastName}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <Mail className="size-3.5 text-slate-400" />
                          {worker.email}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-slate-500">
                          <Phone className="size-3.5 text-slate-400" />
                          {worker.phone}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {worker.servicesOffered.map((service) => (
                            <Badge
                              className="bg-slate-100 text-slate-800 text-[10px]"
                              key={service}
                            >
                              {service.replaceAll("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          className={
                            worker.onboardingStatus === "approved"
                              ? "bg-lime-100 text-lime-800"
                              : "bg-amber-100 text-amber-900"
                          }
                        >
                          {worker.onboardingStatus === "approved" ? (
                            <CheckCircle2 className="mr-1 size-3" />
                          ) : null}
                          {worker.onboardingStatus.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">
                        {new Date(worker.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {worker.onboardingStatus === "approved" ? (
                          <Badge className="bg-slate-100 text-slate-600 text-xs">
                            Approved · Connect next
                          </Badge>
                        ) : (
                          <Button
                            className="h-8 rounded-full bg-lime-300 px-3 text-xs font-bold text-slate-950 hover:bg-lime-200"
                            onClick={() => void approveWorker(worker.id)}
                            size="sm"
                            type="button"
                          >
                            Approve & Activate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {!isLoading && workers.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-slate-500"
                        colSpan={6}
                      >
                        <Inbox className="mx-auto size-6 text-slate-400" />
                        <p className="mt-2 font-bold">
                          No provider applications in queue
                        </p>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
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
