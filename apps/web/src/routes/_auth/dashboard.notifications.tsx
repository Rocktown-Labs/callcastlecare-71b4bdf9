import { Badge } from "@callcastlecare/ui/components/badge";
import { Button } from "@callcastlecare/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bell, Check, Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getServerUrl } from "@/lib/server-url";

interface NotificationItem {
  body: string;
  createdAt: string;
  id: number;
  readAt?: string | null;
  status: string;
  subject?: string | null;
}

const DashboardNotificationsRoute = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      const response = await fetch(
        new URL("/api/v1/notifications", getServerUrl()),
        {
          credentials: "include",
        }
      );

      if (!(active && response.ok)) {
        setIsLoading(false);
        return;
      }

      const payload = (await response.json()) as {
        notifications?: NotificationItem[];
      };
      setNotifications(payload.notifications ?? []);
      setIsLoading(false);
    };

    const runLoadNotifications = async () => {
      try {
        await loadNotifications();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Notifications failed"
        );
        setIsLoading(false);
      }
    };

    void runLoadNotifications();

    return () => {
      active = false;
    };
  }, []);

  const markRead = async (id: number) => {
    const response = await fetch(
      new URL(`/api/v1/notifications/${id}/read`, getServerUrl()),
      {
        credentials: "include",
        method: "POST",
      }
    );

    if (!response.ok) {
      toast.error("Notification could not be updated.");
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, readAt: new Date().toISOString() }
          : notification
      )
    );
  };

  return (
    <main className="px-4 py-6 text-slate-950 sm:py-10">
      <div className="mx-auto grid max-w-5xl gap-6">
        <section className="grid gap-3 border-slate-200 border-b bg-white px-1 pb-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
            <Bell className="size-4" />
            Customer notifications
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">
            Updates
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Booking, service, and account updates will collect here as your
            CastleCare activity grows.
          </p>
        </section>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
            Loading notifications...
          </div>
        ) : null}

        {!isLoading && notifications.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Inbox className="mx-auto size-8 text-lime-600" />
            <h2 className="mt-3 text-xl font-black">Nothing new yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Book a service and the important status updates will appear here.
            </p>
            <Link to="/dashboard/book">
              <Button
                className="mt-5 rounded-full bg-lime-300 font-bold text-slate-950 hover:bg-lime-200"
                type="button"
              >
                Book service
              </Button>
            </Link>
          </section>
        ) : null}

        <section className="grid gap-3">
          {notifications.map((notification) => (
            <article
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              key={notification.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black">
                      {notification.subject ?? "CastleCare update"}
                    </h2>
                    {notification.readAt ? (
                      <Badge variant="secondary">Read</Badge>
                    ) : (
                      <Badge className="bg-lime-300 text-slate-950">New</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {notification.body}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                {notification.readAt ? null : (
                  <Button
                    className="rounded-full border-slate-200"
                    onClick={() => void markRead(notification.id)}
                    type="button"
                    variant="outline"
                  >
                    <Check className="size-4" />
                    Mark read
                  </Button>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
};

export const Route = createFileRoute("/_auth/dashboard/notifications")({
  component: DashboardNotificationsRoute,
});
