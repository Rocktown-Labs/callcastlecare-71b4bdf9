import { expo } from "@better-auth/expo";
import { createDb } from "@callcastlecare/db";
import * as schema from "@callcastlecare/db/schema/auth";
import { env } from "@callcastlecare/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "pg",

      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [expo()],
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      env.CORS_ORIGIN,
      "callcastlecare://",
      "exp://",
      "http://localhost:8081",
    ],
  });
}

export const auth = createAuth();
