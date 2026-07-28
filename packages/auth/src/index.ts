import { expo } from "@better-auth/expo";
import { stripe } from "@better-auth/stripe";
import { createDb } from "@callcastlecare/db";
import * as schema from "@callcastlecare/db/schema/auth";
import { env } from "@callcastlecare/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import StripeSdk from "stripe";

import { sendAuthEmail } from "./email";

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
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ url, user }) => {
        await Promise.resolve();
        void sendAuthEmail({
          body: "We received a request to reset your CastleCare password. This link will take you back to CastleCare to choose a new password.",
          buttonLabel: "Reset password",
          preview: "Reset your CastleCare password.",
          subject: "Reset your CastleCare password",
          title: "Reset your password",
          to: user.email,
          url,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ url, user }) => {
        await Promise.resolve();
        void sendAuthEmail({
          body: "Confirm this email address to finish setting up your CastleCare account and access your booking dashboard.",
          buttonLabel: "Verify email",
          preview: "Verify your CastleCare email address.",
          subject: "Verify your CastleCare email",
          title: "Verify your email",
          to: user.email,
          url,
        });
      },
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
