/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { EmailShell } from "./components";

export interface OtpEmailProps {
  body: string;
  code: string;
  preview: string;
  title: string;
}

export const OtpEmail = Object.assign(
  ({ body, code, preview, title }: OtpEmailProps) => (
    <EmailShell preview={preview} title={title}>
      <Section className="px-7 pt-6 pb-7">
        <Text className="m-0 mb-5 text-[15px] leading-[1.7] text-muted">
          {body}
        </Text>
        <Section className="rounded border border-solid border-border bg-soft px-5 py-4 text-center">
          <Text className="m-0 font-mono text-[32px] font-bold tracking-[0.28em] text-ink">
            {code}
          </Text>
        </Section>
        <Text className="m-0 mt-5 text-[12px] leading-[1.6] text-muted">
          This code expires soon. If you did not request it, you can safely
          ignore this email.
        </Text>
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      body: "Use this one-time code to continue with CastleCare.",
      code: "123456",
      preview: "Your CastleCare verification code.",
      title: "Your CastleCare code",
    } satisfies OtpEmailProps,
  }
);

export default OtpEmail;
