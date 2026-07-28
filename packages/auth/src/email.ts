import { env } from "@callcastlecare/env/server";
import { Resend } from "resend";

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const fromAddress = "CastleCare <noreply@info.callcastlecare.com>";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

interface AuthEmailInput {
  body: string;
  buttonLabel: string;
  preview: string;
  title: string;
  subject: string;
  to: string;
  url: string;
}

const renderActionEmail = ({
  body,
  buttonLabel,
  preview,
  title,
  url,
}: AuthEmailInput) => {
  const safeBody = escapeHtml(body);
  const safeButtonLabel = escapeHtml(buttonLabel);
  const safePreview = escapeHtml(preview);
  const safeTitle = escapeHtml(title);
  const safeUrl = escapeHtml(url);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;background:#f7f7f5;color:#18181b;font-family:Inter,Arial,sans-serif;">
    <span style="display:none;opacity:0;visibility:hidden;">${safePreview}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 12px;">
                <p style="margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#737373;">CastleCare</p>
                <h1 style="margin:0;font-size:24px;line-height:1.25;color:#18181b;">${safeTitle}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;">
                <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#52525b;">${safeBody}</p>
                <a href="${safeUrl}" style="display:inline-block;border-radius:6px;background:#18181b;color:#ffffff;font-size:14px;font-weight:700;line-height:1;text-decoration:none;padding:14px 18px;">${safeButtonLabel}</a>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#71717a;">If the button does not work, paste this link into your browser:<br /><a href="${safeUrl}" style="color:#18181b;word-break:break-all;">${safeUrl}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const sendAuthEmail = async (input: AuthEmailInput) => {
  if (!resendClient) {
    return;
  }

  try {
    await resendClient.emails.send({
      from: fromAddress,
      html: renderActionEmail(input),
      subject: input.subject,
      text: `${input.body}\n\n${input.url}`,
      to: input.to,
    });
  } catch {
    // Better Auth intentionally should not reveal email delivery state.
  }
};
