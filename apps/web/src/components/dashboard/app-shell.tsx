import { Button } from "@callcastlecare/ui/components/button";
import { cn } from "@callcastlecare/ui/lib/utils";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Headphones,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  ShoppingBag,
  ShieldCheck,
  Star,
  UsersRound,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";

type AppShellVariant = "admin" | "customer" | "provider";

interface AppShellProps {
  children: ReactNode;
  isAdmin?: boolean;
  userEmail: string;
  variant: AppShellVariant;
}

const getNavigation = (variant: AppShellVariant, isAdmin: boolean) => {
  if (variant === "provider") {
    return [
      {
        href: "/dashboard/provider",
        icon: LayoutDashboard,
        label: "Provider Hub",
        matchExact: true,
      },
      {
        href: "/dashboard/help",
        icon: Headphones,
        label: "Support",
      },
      {
        href: "/dashboard/settings",
        icon: Settings,
        label: "Settings",
      },
    ];
  }

  const customerNavigation = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Overview",
      matchExact: true,
    },
    {
      href: "/dashboard/orders",
      icon: ReceiptText,
      label: "Orders",
    },
    {
      href: "/dashboard/reviews",
      icon: Star,
      label: "Reviews",
    },
    {
      href: "/dashboard/help",
      icon: Headphones,
      label: "Help",
    },
    {
      href: "/dashboard/notifications",
      icon: Bell,
      label: "Notifications",
    },
    {
      href: "/dashboard/settings",
      icon: Settings,
      label: "Settings",
    },
  ];

  if (variant === "customer") {
    return isAdmin
      ? [
          ...customerNavigation,
          {
            href: "/admin",
            icon: ShieldCheck,
            label: "Admin view",
          },
        ]
      : customerNavigation;
  }

  return [
    {
      href: "/admin",
      icon: LayoutDashboard,
      label: "Operations",
      matchExact: true,
    },
    {
      href: "/admin/orders",
      icon: ReceiptText,
      label: "Orders",
    },
    {
      href: "/admin/catalog",
      icon: ShoppingBag,
      label: "Catalog",
    },
    {
      href: "/admin/support",
      icon: Headphones,
      label: "Support",
    },
    {
      href: "/admin/staff",
      icon: UsersRound,
      label: "Staff",
    },
    {
      href: "/admin/notifications",
      icon: Bell,
      label: "Notifications",
    },
    {
      href: "/admin/settings",
      icon: Settings,
      label: "Settings",
    },
    {
      href: "/dashboard",
      icon: UserRound,
      label: "Customer view",
    },
  ];
};

const isNavigationItemActive = (
  pathname: string,
  href: string,
  matchExact?: boolean
) => {
  if (matchExact) {
    return pathname === href;
  }

  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export const AppShell = ({
  children,
  isAdmin = false,
  userEmail,
  variant,
}: AppShellProps) => {
  const navigate = useNavigate();
  const [resolvedIsAdmin, setResolvedIsAdmin] = useState(isAdmin);
  const [routeBadges, setRouteBadges] = useState<Record<string, number>>({});
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const navigation = getNavigation(variant, isAdmin || resolvedIsAdmin);

  useEffect(() => {
    if (isAdmin || variant !== "customer") {
      return;
    }

    let active = true;

    const loadSession = async () => {
      const response = await fetch(new URL("/api/v1/me", getServerUrl()), {
        credentials: "include",
      });
      if (!(active && response.ok)) {
        return;
      }
      const payload = (await response.json().catch(() => null)) as {
        isAdmin?: boolean;
      } | null;
      setResolvedIsAdmin(Boolean(payload?.isAdmin));
    };

    void loadSession();

    return () => {
      active = false;
    };
  }, [isAdmin, variant]);

  useEffect(() => {
    let active = true;

    const loadBadges = async () => {
      const endpoint =
        variant === "admin"
          ? "/api/v1/admin/summary"
          : "/api/v1/notifications/summary";
      const response = await fetch(new URL(endpoint, getServerUrl()), {
        credentials: "include",
      });
      if (!(active && response.ok)) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        activeOrders?: number;
        openSupport?: number;
        pendingWorkers?: number;
        unreadNotifications?: number;
      } | null;

      if (!payload) {
        return;
      }

      setRouteBadges(
        variant === "admin"
          ? {
              "/admin/notifications": payload.unreadNotifications ?? 0,
              "/admin/orders": payload.activeOrders ?? 0,
              "/admin/staff": payload.pendingWorkers ?? 0,
              "/admin/support": payload.openSupport ?? 0,
            }
          : {
              "/dashboard/notifications": payload.unreadNotifications ?? 0,
            }
      );
    };

    void loadBadges();

    return () => {
      active = false;
    };
  }, [variant]);

  const signOut = async () => {
    await authClient.signOut();
    await navigate({ to: "/sign-in" });
  };

  return (
    <div className="min-h-svh bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-slate-200 border-r bg-white lg:flex lg:min-h-svh lg:flex-col">
        <div className="border-slate-200 border-b px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-lime-300">
              {variant === "admin" ? (
                <ShieldCheck className="size-5" />
              ) : (
                <UserRound className="size-5" />
              )}
            </div>
            <div>
              <p className="font-black text-slate-950">CastleCare</p>
              <p className="text-xs font-semibold text-slate-500">
                {variant === "admin" ? "Admin workspace" : "Customer account"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map(({ href, icon: Icon, label, matchExact }) => {
            const isActive = isNavigationItemActive(pathname, href, matchExact);
            const badgeCount = routeBadges[href] ?? 0;

            return (
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors",
                  isActive
                    ? "bg-lime-100 text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                )}
                key={`${href}-${label}`}
                to={href}
              >
                <Icon className="size-4" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {badgeCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-slate-950 px-1.5 text-[11px] leading-5 text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-slate-200 border-t p-4">
          <p className="truncate text-sm font-bold text-slate-950">
            {userEmail}
          </p>
          <Button
            className="mt-3 h-10 w-full justify-start rounded-2xl border-slate-200 text-slate-700"
            onClick={() => void signOut()}
            type="button"
            variant="outline"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-slate-200 border-b bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-black">CastleCare</p>
              <p className="text-xs text-slate-500">
                {variant === "admin" ? "Admin workspace" : "Customer account"}
              </p>
            </div>
            <Button
              className="rounded-full"
              onClick={() => void signOut()}
              size="sm"
              type="button"
              variant="outline"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navigation.map(({ href, icon: Icon, label, matchExact }) => {
              const isActive = isNavigationItemActive(
                pathname,
                href,
                matchExact
              );

              return (
                <Link
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold",
                    isActive
                      ? "border-lime-300 bg-lime-100 text-slate-950"
                      : "border-slate-200 bg-white text-slate-700"
                  )}
                  key={`${href}-${label}-mobile`}
                  to={href}
                >
                  <Icon className="size-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
};
