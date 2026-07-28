import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/components/auth/auth-page";

const siteUrl = "https://callcastlecare.com";
const signInUrl = `${siteUrl}/sign-in`;
const signInTitle = "Sign In | CastleCare Customer Account";
const signInDescription =
  "Sign in to manage CastleCare lawn care, laundry pickup, and window washing bookings, deposits, and service updates across Arkansas.";
const signInImage = `${siteUrl}/callcastlecare/media/technician-van-night.png`;

const RouteComponent = () => (
  <AuthPage
    description="Manage bookings, deposits, checkout choices, and service updates for lawn care, laundry pickup, and window washing."
    eyebrow="Customer account"
    title="Sign in to CastleCare"
    view="signIn"
  />
);

export const Route = createFileRoute("/sign-in")({
  component: RouteComponent,
  head: () => ({
    links: [{ href: signInUrl, rel: "canonical" }],
    meta: [
      { title: signInTitle },
      { content: signInDescription, name: "description" },
      { content: signInTitle, property: "og:title" },
      { content: signInDescription, property: "og:description" },
      { content: signInImage, property: "og:image" },
      { content: signInUrl, property: "og:url" },
      { content: "website", property: "og:type" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: signInTitle, name: "twitter:title" },
      { content: signInDescription, name: "twitter:description" },
      { content: signInImage, name: "twitter:image" },
    ],
  }),
});
