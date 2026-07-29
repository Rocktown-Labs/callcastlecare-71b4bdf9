import { emailTheme } from "@callcastlecare/email";
import { env } from "@callcastlecare/env/server";
import { Resend } from "resend";

import { logger } from "../logger";

const getResendClient = () =>
  env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const sendEmail = async (input: {
  html: string;
  idempotencyKey: string;
  subject: string;
  text?: string;
  to: string;
}) => {
  const resendClient = getResendClient();
  if (!resendClient) {
    logger.info(
      {
        idempotencyKey: input.idempotencyKey,
        subject: input.subject,
        to: input.to,
      },
      "email:skipped:no_api_key"
    );
    return;
  }

  const result = await resendClient.emails.send(
    {
      from: emailTheme.from,
      html: input.html,
      replyTo: emailTheme.replyTo,
      subject: input.subject,
      text: input.text,
      to: input.to,
    },
    {
      idempotencyKey: input.idempotencyKey,
    }
  );

  if (result.error) {
    logger.error(
      {
        error: result.error,
        idempotencyKey: input.idempotencyKey,
        subject: input.subject,
        to: input.to,
      },
      "email:send:failed"
    );
    return;
  }

  logger.info(
    {
      emailId: result.data?.id ?? null,
      idempotencyKey: input.idempotencyKey,
      subject: input.subject,
      to: input.to,
    },
    "email:sent"
  );
};
