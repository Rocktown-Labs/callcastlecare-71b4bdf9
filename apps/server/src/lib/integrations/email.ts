import { env } from "@callcastlecare/env/server";
import { Resend } from "resend";

import { logger } from "../logger";

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const fromAddress = "CastleCare <noreply@info.callcastlecare.com>";

export const sendEmail = async (input: {
  html: string;
  subject: string;
  text?: string;
  to: string;
}) => {
  if (!resendClient) {
    logger.info(
      {
        subject: input.subject,
        to: input.to,
      },
      "email:skipped:no_api_key"
    );
    return;
  }

  const result = await resendClient.emails.send({
    from: fromAddress,
    html: input.html,
    subject: input.subject,
    text: input.text,
    to: input.to,
  });

  if (result.error) {
    logger.error(
      {
        error: result.error,
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
      subject: input.subject,
      to: input.to,
    },
    "email:sent"
  );
};
