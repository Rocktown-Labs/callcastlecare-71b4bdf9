import { QueryClientProvider } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { MouseEventHandler, ReactNode } from "react";
import { useMemo } from "react";

import { AuthProvider } from "@/components/auth/auth-provider";
import { authClient } from "@/lib/auth-client";
import { createWebQueryClient } from "@/lib/query-client";

const authViewPaths = {
  forgotPassword: "forgot-password",
  redirect: "auth/redirect",
  resetLinkSent: "reset-link-sent",
  resetPassword: "reset-password",
  signIn: "login",
  signOut: "sign-out",
  signUp: "sign-up",
  verifyEmail: "verify-email",
} as const;

const AuthLink = ({
  children,
  href,
  ...props
}: Readonly<{
  children: ReactNode;
  className?: string;
  href: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  tabIndex?: number;
  "aria-disabled"?: boolean;
}>) => (
  <Link {...props} to={href}>
    {children}
  </Link>
);

export default function Providers({
  children,
}: Readonly<{ children: ReactNode }>) {
  const queryClient = useMemo(() => createWebQueryClient(), []);
  const navigate = useNavigate();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        authClient={authClient}
        basePaths={{ auth: "" }}
        baseURL=""
        emailAndPassword={{
          confirmPassword: true,
          enabled: true,
          forgotPassword: true,
          minPasswordLength: 8,
          requireEmailVerification: true,
        }}
        Link={AuthLink}
        navigate={({ replace, to }) => {
          void navigate({ replace, to });
        }}
        redirectTo="/dashboard"
        socialProviders={["google"]}
        viewPaths={{ auth: authViewPaths }}
      >
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
