import { auth } from "@callcastlecare/auth";
import { env } from "@callcastlecare/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import notFound from "stoker/middlewares/not-found";
import onError from "stoker/middlewares/on-error";

import { requestLogger, logger } from "./lib/logger";
import { addressesRoutes } from "./routes/addresses";
import { adminRoutes } from "./routes/admin";
import { checkoutRoutes } from "./routes/checkout";
import { locationRoutes } from "./routes/locations";
import { meRoutes } from "./routes/me";
import { notificationRoutes } from "./routes/notifications";
import { orderRoutes } from "./routes/orders";
import { supportRoutes } from "./routes/support";
import { webhookRoutes } from "./routes/webhooks";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

const toStringOrNull = (value: unknown) =>
  typeof value === "string" ? value : null;

const toNumberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const getErrorLogFields = (error: unknown) => {
  if (error instanceof Response) {
    return {
      errorStatus: error.status,
      errorStatusText: error.statusText,
      errorType: "Response",
    };
  }

  if (error instanceof Error) {
    const candidate = error as Error & {
      cause?: unknown;
      code?: unknown;
      status?: unknown;
      statusCode?: unknown;
    };

    return {
      errorCode: toStringOrNull(candidate.code),
      errorMessage: error.message,
      errorStatus:
        toNumberOrNull(candidate.status) ??
        toNumberOrNull(candidate.statusCode),
      errorType: error.name,
      hasCause: candidate.cause !== undefined,
    };
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as Record<string, unknown>;
    return {
      errorCode: toStringOrNull(candidate.code),
      errorMessage:
        toStringOrNull(candidate.message) ??
        toStringOrNull(candidate.error) ??
        "non_error_throwable",
      errorStatus:
        toNumberOrNull(candidate.status) ??
        toNumberOrNull(candidate.statusCode),
      errorType:
        toStringOrNull(candidate.name) ??
        toStringOrNull(candidate.type) ??
        "object",
    };
  }

  return {
    errorMessage: String(error),
    errorType: typeof error,
  };
};

app.use(requestLogger());
app.use(
  "/*",
  cors({
    allowHeaders: ["Content-Type", "Authorization", "Cookie", "x-request-id"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    origin: (origin) => {
      if (!origin || !env.CORS_ORIGIN) {
        return origin || "*";
      }
      if (env.CORS_ORIGIN === "*" || env.CORS_ORIGIN === origin) {
        return origin;
      }
      if (origin.endsWith(".vercel.app") || origin.includes("localhost")) {
        return origin;
      }
      return env.CORS_ORIGIN;
    },
  })
);

app.use("/*", async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return await next();
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return await next();
});

app.on(["POST", "GET", "OPTIONS"], ["/api/auth/*", "/auth/*"], (c) =>
  auth.handler(c.req.raw)
);

export const apiRoutes = new Hono<AppEnv>()
  .get("/health", (c) => c.json({ ok: true }, 200))
  .get("/me", (c) => {
    const user = c.get("user");
    const session = c.get("session");

    if (!user || !session) {
      return c.json({ error: "unauthorized" }, 401);
    }

    return c.json({ session, user }, 200);
  })
  .route("/checkout", checkoutRoutes)
  .route("/me", meRoutes)
  .route("/addresses", addressesRoutes)
  .route("/locations", locationRoutes)
  .route("/orders", orderRoutes)
  .route("/notifications", notificationRoutes)
  .route("/support", supportRoutes)
  .route("/webhooks", webhookRoutes)
  .route("/admin", adminRoutes);

const routes = app
  .route("/api", apiRoutes)
  .route("/", apiRoutes)
  .get("/", (c) => c.text("OK"));

app.notFound(notFound);
// eslint-disable-next-line promise/prefer-await-to-callbacks -- Hono onError requires handler callback shape.
app.onError(async (error, c) => {
  logger.error(
    {
      err: error,
      ...getErrorLogFields(error),
      method: c.req.method,
      path: c.req.path,
      requestId: c.get("requestId"),
      userId: c.get("user")?.id ?? null,
    },
    "request:error"
  );

  return await onError(error, c);
});

export { app, routes };
export type ApiType = typeof apiRoutes;
export type AppType = typeof routes;
