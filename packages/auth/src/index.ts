import { expo } from "@better-auth/expo";
import { stripe } from "@better-auth/stripe";
import { createDb } from "@callcastlecare/db";
import * as schema from "@callcastlecare/db/schema/auth";
import { env } from "@callcastlecare/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import StripeSdk from "stripe";

const createStripePlugin = () => {
  if (!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)) {
    return null;
  }

  const stripeClient = new StripeSdk(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });

  return stripe({
    createCustomerOnSignUp: true,
    getCustomerCreateParams: (user) =>
      Promise.resolve({
        email: user.email,
        metadata: {
          betterAuthUserId: user.id,
          castlecareAdmin:
            user.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase()
              ? "true"
              : "false",
        },
        name: user.name,
      }),
    stripeClient,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    ...(env.STRIPE_PRICE_BASIC_MONTHLY
      ? {
          subscription: {
            enabled: true,
            plans: [
              {
                name: "basic",
                priceId: env.STRIPE_PRICE_BASIC_MONTHLY,
              },
            ],
          },
        }
      : {}),
  });
};

export const createAuth = () => {
  const db = createDb();
  const stripePlugin = createStripePlugin();

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
    plugins: [
      expo(),
      admin({
        adminRoles: ["admin"],
        defaultRole: "user",
      }),
      ...(stripePlugin ? [stripePlugin] : []),
    ],
    secret: env.BETTER_AUTH_SECRET,
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : undefined,
    trustedOrigins: [
      env.CORS_ORIGIN,
      "callcastlecare://",
      "exp://",
      "http://localhost:8081",
    ],
  });
};

export const auth = createAuth();
