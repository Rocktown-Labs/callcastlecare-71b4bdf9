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

const getResendClient = () =>
  env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const sendAuthEmail = async (input: AuthEmailInput) => {
  const resendClient = getResendClient();
  if (!resendClient) {
    return;
  }

  try {
    const rendered = await renderActionEmail(input);
    await resendClient.emails.send(
      {
        from: emailTheme.from,
        html: rendered.html,
        replyTo: emailTheme.replyTo,
        subject: input.subject,
        text: rendered.text,
        to: input.to,
      },
      {
        idempotencyKey: `auth-email/${input.subject}/${input.to}`,
      }
    );
  } catch {
    // Better Auth intentionally should not reveal email delivery state.
  }
};

export const sendAuthOtpEmail = async (input: AuthOtpEmailInput) => {
  const resendClient = getResendClient();
  if (!resendClient) {
    return;
  }

  try {
    const rendered = await renderOtpEmail({
      body: input.body,
      code: input.otp,
      preview: input.preview,
      title: input.title,
    });
    await resendClient.emails.send(
      {
        from: emailTheme.from,
        html: rendered.html,
        replyTo: emailTheme.replyTo,
        subject: input.subject,
        text: rendered.text,
        to: input.to,
      },
      {
        idempotencyKey: `auth-otp/${input.subject}/${input.to}/${input.otp}`,
      }
    );
  } catch {
    // Better Auth intentionally should not reveal email delivery state.
  }
};
