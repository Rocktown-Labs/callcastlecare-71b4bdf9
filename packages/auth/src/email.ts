import { createHash } from "node:crypto";

import {
  castleCareUrl,
  emailTheme,
  renderActionEmail,
  renderOtpEmail,
  renderWelcomeEmail,
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

export const sendAuthOtpEmail = async (input: AuthOtpEmailInput) => {
  const resendClient = getResendClient();
  if (!resendClient) {
    return;
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
};

export const sendWelcomeAuthEmail = async (input: {
  customerName?: string;
  dashboardUrl?: string;
  to: string;
}) => {
  const resendClient = getResendClient();
  if (!resendClient) {
    return;
  }

  const rendered = await renderWelcomeEmail(input);
  await resendClient.emails.send(
    {
      from: emailTheme.from,
      html: rendered.html,
      replyTo: emailTheme.replyTo,
      subject: "Welcome to CastleCare",
      text: rendered.text,
      to: input.to,
    },
    {
      idempotencyKey: createIdempotencyKey("auth-welcome", [
        "Welcome to CastleCare",
        input.to,
      ]),
    }
  );
};

export const sendAdminSignupNotification = async (input: {
  customerEmail: string;
  customerName: string;
}) => {
  const resendClient = getResendClient();
  const adminEmail = env.ADMIN_EMAIL;
  if (!resendClient || !adminEmail) {
    return;
  }

  const rendered = await renderActionEmail({
    body: `A new customer account was created for ${input.customerName} (${input.customerEmail}).`,
    buttonLabel: "Open Admin Dashboard",
    preview: `New customer signup: ${input.customerName}`,
    title: "New Customer Signup",
    url: castleCareUrl("/admin"),
  });

  await resendClient.emails.send(
    {
      from: emailTheme.from,
      html: rendered.html,
      replyTo: emailTheme.replyTo,
      subject: `New Customer Signup: ${input.customerName}`,
      text: rendered.text,
      to: adminEmail,
    },
    {
      idempotencyKey: createIdempotencyKey("admin-signup-alert", [
        adminEmail,
        input.customerEmail,
      ]),
    }
  );
};
