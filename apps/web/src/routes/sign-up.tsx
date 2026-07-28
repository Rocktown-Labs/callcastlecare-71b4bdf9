import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/components/auth/auth-page";

const siteUrl = "https://callcastlecare.com";
const signUpUrl = `${siteUrl}/sign-up`;
const signUpTitle = "Create Account | CastleCare Customer Account";
const signUpDescription =
  "Create a CastleCare account to keep Arkansas home service booking details, service status, deposits, and checkout preferences together.";
const signUpImage = `${siteUrl}/callcastlecare/media/technician-van-night.png`;

const RouteComponent = () => (
  <AuthPage
    description="Keep booking details, service status, deposits, and checkout preferences in one place after you start a quote."
    eyebrow="Customer account"
    title="Create your CastleCare account"
    view="signUp"
  />
);

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
});
