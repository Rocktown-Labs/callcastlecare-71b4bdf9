import { createHash } from "node:crypto";

import {
  emailTheme,
  renderActionEmail,
  renderOtpEmail,
} from "@callcastlecare/email";
import { env } from "@callcastlecare/env/server";
import { Resend } from "resend";

interface AuthEmailInput {
  body: string;
  buttonLabel: string;
  preview: string;
  title: string;
  subject: string;
  to: string;
  url: string;
}

interface AuthOtpEmailInput {
  body: string;
  otp: string;
  preview: string;
  subject: string;
  title: string;
  to: string;
}

export type AuthOtpType =
  | "change-email"
  | "email-verification"
  | "forget-password"
  | "sign-in";

export const getOtpEmailContent = (type: AuthOtpType) => {
  if (type === "sign-in") {
    return {
      body: "Use this one-time code to sign in to your CastleCare account.",
      preview: "Your CastleCare sign-in code.",
      subject: "Your CastleCare sign-in code",
      title: "Sign in to CastleCare",
    };
  }

  if (type === "email-verification") {
    return {
      body: "Use this one-time code to verify your CastleCare email address.",
      preview: "Your CastleCare verification code.",
      subject: "Verify your CastleCare email",
      title: "Verify your email",
    };
  }

  return {
    body: "Use this one-time code to reset your CastleCare password.",
    preview: "Your CastleCare password reset code.",
    subject: "Reset your CastleCare password",
    title: "Reset your password",
  };
};

const getResendClient = () =>
  env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const createIdempotencyKey = (prefix: string, parts: string[]) => {
  const digest = createHash("sha256").update(parts.join("\0")).digest("hex");
  return `${prefix}/${digest}`;
};

export const sendAuthEmail = async (input: AuthEmailInput) => {
  const resendClient = getResendClient();
  if (!resendClient) {
    return;
  }

  const rendered = await renderActionEmail(input);
  const result = await resendClient.emails.send(
    {
      from: emailTheme.from,
      html: rendered.html,
      replyTo: emailTheme.replyTo,
      subject: input.subject,
      text: rendered.text,
      to: input.to,
    },
    {
      idempotencyKey: createIdempotencyKey("auth-email", [
        input.subject,
        input.to,
        input.url,
      ]),
    }
  );

  if (result.error) {
    throw new Error("Resend auth email send failed.", {
      cause: result.error,
    });
  }
};

export const sendAuthOtpEmail = async (
  input: AuthOtpEmailInput
): Promise<{ reason?: string; sent: boolean }> => {
  const resendClient = getResendClient();
  if (!resendClient) {
    // Callers (e.g. /send-login-code) must treat this as a delivery failure,
    // never as a silent success.
    return { reason: "missing_resend_api_key", sent: false };
  }

  const rendered = await renderOtpEmail({
    body: input.body,
    code: input.otp,
    preview: input.preview,
    title: input.title,
  });
  const result = await resendClient.emails.send(
    {
      from: emailTheme.from,
      html: rendered.html,
      replyTo: emailTheme.replyTo,
      subject: input.subject,
      text: rendered.text,
      to: input.to,
    },
    {
      idempotencyKey: createIdempotencyKey("auth-otp", [
        input.subject,
        input.to,
        input.otp,
      ]),
    }
  );

  if (result.error) {
    throw new Error("Resend auth OTP email send failed.", {
      cause: result.error,
    });
  }

  return { sent: true };
};
