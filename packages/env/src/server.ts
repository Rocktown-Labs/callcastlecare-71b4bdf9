import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const getVercelOrigin = () => {
  const vercelUrl =
    process.env.VERCEL_ENV === "production"
      ? (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL)
      : (process.env.VERCEL_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (!vercelUrl) {
    return;
  }
  return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
};

const vercelOrigin = getVercelOrigin();

const runtimeEnv = {
  ...process.env,
  // Public auth base: /api/auth bypasses the rewrite's path strip, so the
  // same URL works for incoming matching and generated callbacks
  BETTER_AUTH_URL:
    process.env.BETTER_AUTH_URL ??
    (vercelOrigin ? `${vercelOrigin}/api/auth` : undefined),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? vercelOrigin,
  // Vercel's Blob integration uses BLOB_READ_WRITE_TOKEN, while the app's
  // internal name stays explicit about the service it configures.
  VERCEL_BLOB_READ_WRITE_TOKEN:
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN ??
    process.env.BLOB_READ_WRITE_TOKEN,
};

export const env = createEnv({
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
    RADAR_API_KEY: z.string().min(1).optional(),
    RAPIDAPI_KEY: z.string().min(1).optional(),
    RAPIDAPI_ZILLOW_HOST: z.string().min(1).optional(),
    RENTCAST_API_KEY: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PRICE_BASIC_MONTHLY: z.string().min(1).optional(),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_PUBLIC_URL: z.url().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    VERCEL_BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
