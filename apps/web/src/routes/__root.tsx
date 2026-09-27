import { Toaster } from "@callcastlecare/ui/components/sonner";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Providers from "@/components/providers";

import appCss from "../index.css?url";

export type RouterAppContext = Record<string, never>;

const RootDocument = () => (
  <html lang="en" className="dark">
    <head>
      <HeadContent />
    </head>
    <body>
      <Providers>
        <div className="min-h-svh">
          <Outlet />
        </div>
        <Toaster richColors />
        <TanStackRouterDevtools position="bottom-left" />
        <Scripts />
      </Providers>
    </body>
  </html>
);

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootDocument,

  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
      {
        href: "/favicon.ico",
        rel: "icon",
        sizes: "32x32",
      },
      {
        href: "/favicon.svg",
        rel: "icon",
        type: "image/svg+xml",
      },
      {
        href: "/favicon-96x96.png",
        rel: "icon",
        sizes: "96x96",
        type: "image/png",
      },
      {
        href: "/apple-touch-icon.png",
        rel: "apple-touch-icon",
        sizes: "180x180",
      },
      {
        href: "/site.webmanifest",
        rel: "manifest",
      },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        content: "#050a30",
        name: "theme-color",
      },
      {
        content: "CastleCare",
        name: "apple-mobile-web-app-title",
      },
      {
        title: "CastleCare",
      },
    ],
  }),

  server: {
    middleware: [],
  },
});
