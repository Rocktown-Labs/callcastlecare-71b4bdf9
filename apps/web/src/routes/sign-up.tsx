import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { AuthPage } from "@/components/auth/auth-page";

const siteUrl = "https://callcastlecare.com";
const signUpUrl = `${siteUrl}/sign-up`;
const signUpTitle = "Create Account | CastleCare Customer Account";
const signUpDescription =
  "Create a CastleCare account to keep Arkansas home service booking details, service status, deposits, and checkout preferences together.";
const signUpImage = `${siteUrl}/callcastlecare/media/technician-van-night.png`;

const signUpSearchSchema = z.object({
  intent: z.enum(["booking", "earn"]).optional(),
  plan: z.enum(["free", "pro"]).optional(),
  role: z.enum(["customer", "staff"]).optional(),
});

const RouteComponent = () => {
  const search = useSearch({ from: "/sign-up" });
  const isProviderSignup = search.role === "staff" || search.intent === "earn";
  const providerDescription =
    search.plan === "pro"
      ? "Create your provider account to keep the CastleCare Pro setup moving, then continue into application status and next steps."
      : "Create your provider account to save your application, view manual review status, and continue setup from the dashboard.";

  return (
    <AuthPage
      description={
        isProviderSignup
          ? providerDescription
          : "Keep booking details, service status, deposits, and checkout preferences in one place after you start a quote."
      }
      eyebrow={isProviderSignup ? "Provider account" : "Customer account"}
      title={
        isProviderSignup
          ? "Create your CastleCare provider account"
          : "Create your CastleCare account"
      }
      view="signUp"
    />
  );
};

export const Route = createFileRoute("/sign-up")({
  component: RouteComponent,
  head: () => ({
    links: [{ href: signUpUrl, rel: "canonical" }],
    meta: [
      { title: signUpTitle },
      { content: signUpDescription, name: "description" },
      { content: signUpTitle, property: "og:title" },
      { content: signUpDescription, property: "og:description" },
      { content: signUpImage, property: "og:image" },
      { content: signUpUrl, property: "og:url" },
      { content: "website", property: "og:type" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: signUpTitle, name: "twitter:title" },
      { content: signUpDescription, name: "twitter:description" },
      { content: signUpImage, name: "twitter:image" },
    ],
  }),
  validateSearch: (search) => signUpSearchSchema.parse(search),
});
