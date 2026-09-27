import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

type EnvSource = Record<string, string | undefined>;

const isNode =
  typeof (globalThis as { process?: { versions?: { node?: string } } }).process
    ?.versions?.node === "string";

if (isNode) {
  // Load .env files only in Node-based environments; Cloudflare Workers receive
  // env values through bindings instead.
  await import("dotenv/config");
}

let envSource: EnvSource =
  typeof process !== "undefined" && process.env ? process.env : {};
let cachedEnv: Env | undefined;

const getVercelOrigin = (source: EnvSource) => {
  const vercelUrl =
    source.VERCEL_ENV === "production"
      ? (source.VERCEL_PROJECT_PRODUCTION_URL ?? source.VERCEL_URL)
      : (source.VERCEL_URL ?? source.VERCEL_PROJECT_PRODUCTION_URL);
  if (!vercelUrl) {
    return;
  }
  return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
};

const buildEnv = (source: EnvSource) => {
  const vercelOrigin = getVercelOrigin(source);

  const runtimeEnv = {
    ...source,
    BETTER_AUTH_URL:
      source.BETTER_AUTH_URL ??
      (vercelOrigin ? `${vercelOrigin}/api/auth` : undefined),
    CORS_ORIGIN: source.CORS_ORIGIN ?? vercelOrigin,
    VERCEL_BLOB_READ_WRITE_TOKEN:
      source.VERCEL_BLOB_READ_WRITE_TOKEN ?? source.BLOB_READ_WRITE_TOKEN,
  };

  return createEnv({
    emptyStringAsUndefined: true,
    runtimeEnv,
    server: {
      ADMIN_EMAIL: z.email().default("cg@rocktownlabs.com"),
      BETTER_AUTH_SECRET: z.string().min(32),
      BETTER_AUTH_URL: z.url(),
      CORS_ORIGIN: z.url(),
      DATABASE_URL: z.string().min(1),
      GOOGLE_CLIENT_ID: z.string().min(1).optional(),
      GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
      NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
      PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10_000).default(0),
      PROVIDER_PAYOUT_BPS: z.coerce
        .number()
        .int()
        .min(0)
        .max(10_000)
        .default(6000),
      RADAR_API_KEY: z.string().min(1).optional(),
      RAPIDAPI_KEY: z.string().min(1).optional(),
      RAPIDAPI_ZILLOW_HOST: z.string().min(1).optional(),
      RENTCAST_API_KEY: z.string().min(1).optional(),
      RESEND_API_KEY: z.string().min(1).optional(),
      RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
      STRIPE_BILLING_WEBHOOK_SECRET: z.string().min(1).optional(),
      STRIPE_COMMERCE_WEBHOOK_SECRET: z.string().min(1).optional(),
      STRIPE_CONNECT_WEBHOOK_SECRET: z.string().min(1).optional(),
      STRIPE_PRICE_BASIC_MONTHLY: z.string().min(1).optional(),
      STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
      STRIPE_SECRET_KEY: z
        .string()
        .regex(/^(?:sk|rk)_(?:test|live)_[A-Za-z0-9_]+$/u)
        .optional(),
      STRIPE_WEBHOOK_BASE_URL: z.url().optional(),
      STRIPE_WEBHOOK_PUBLIC_URL: z.url().optional(),
      STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
      VERCEL_BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
    },
    skipValidation:
      typeof process !== "undefined" && process.env
        ? !!process.env.SKIP_ENV_VALIDATION
        : false,
  });
};

export type Env = ReturnType<typeof buildEnv>;

export const setRuntimeEnvSource = (
  source: Record<string, string | undefined>
): void => {
  envSource = source;
  cachedEnv = undefined;
};

const getEnv = (): Env => {
  if (!cachedEnv) {
    cachedEnv = buildEnv(envSource);
  }

  return cachedEnv;
};

export const env = new Proxy({} as Env, {
  get(_, property) {
    return getEnv()[property as keyof Env];
  },
}) as Env;
