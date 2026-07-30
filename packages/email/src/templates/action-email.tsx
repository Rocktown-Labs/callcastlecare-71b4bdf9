/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { castleCareUrl } from "../theme";
import { EmailShell, PrimaryButton } from "./components";

export interface ActionEmailProps {
  body: string;
  buttonLabel: string;
  preview: string;
  title: string;
  url: string;
}

export const ActionEmail = Object.assign(
  ({ body, buttonLabel, preview, title, url }: ActionEmailProps) => (
    <EmailShell preview={preview} title={title}>
      <Section className="px-7 pb-7">
        <Text className="m-0 mb-6 text-[15px] leading-[1.7] text-muted">
          {body}
        </Text>
        <PrimaryButton href={url}>{buttonLabel}</PrimaryButton>
        <Text className="m-0 mt-6 text-[12px] leading-[1.6] text-muted">
          If the button does not work, paste this link into your browser:
          <br />
          {url}
        </Text>
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      body: "Confirm this email address to finish setting up your CastleCare account and access your booking dashboard.",
      buttonLabel: "Verify email",
      preview: "Verify your CastleCare email address.",
      title: "Verify your email",
      url: castleCareUrl("/verify-email?token=preview"),
    } satisfies ActionEmailProps,
  }
);

export default ActionEmail;
