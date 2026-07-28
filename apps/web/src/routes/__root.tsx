import { Toaster } from "@callcastlecare/ui/components/sonner";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createMiddleware } from "@tanstack/react-start";
import { Analytics } from "@vercel/analytics/react";
import { evlogErrorHandler } from "evlog/nitro/v3";

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
        <Analytics />
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
        title: "CastleCare",
      },
    ],
  }),

  server: {
    middleware: [createMiddleware().server(evlogErrorHandler)],
  },
});
