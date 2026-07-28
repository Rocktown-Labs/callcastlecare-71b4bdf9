import type { Context, MiddlewareHandler } from "hono";
import pino from "pino";

const randomRequestId = () => {
  const randomSource = globalThis.crypto;
  if (randomSource && typeof randomSource.randomUUID === "function") {
    return randomSource.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getRequestId = (c: Context) =>
  c.req.header("x-request-id") ?? randomRequestId();

export const logger = pino({
  base: null,
  level: process.env.LOG_LEVEL ?? "info",
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const requestLogger = (): MiddlewareHandler => async (c, next) => {
  const startedAt = Date.now();
  const requestId = getRequestId(c);
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);

  logger.info(
    {
      method: c.req.method,
      path: c.req.path,
      requestId,
    },
    "request:start"
  );

  try {
    await next();
  } finally {
    logger.info(
      {
        durationMs: Date.now() - startedAt,
        method: c.req.method,
        path: c.req.path,
        requestId,
        status: c.res.status,
        userId: c.get("user")?.id ?? null,
      },
      "request:finish"
    );
  }
};
