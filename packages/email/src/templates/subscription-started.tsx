/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { castleCareUrl, formatCents } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface SubscriptionStartedEmailProps {
  customerName?: string;
  dashboardUrl?: string;
  firstServiceWindow?: string;
  planName?: string;
  recurringAmountCents?: number;
  services?: string[];
}

export const SubscriptionStartedEmail = Object.assign(
  ({
    customerName = "there",
    dashboardUrl = castleCareUrl("/dashboard"),
    firstServiceWindow = "Your first service window is being scheduled",
    planName = "CastleCare plan",
    recurringAmountCents = 0,
    services = [],
  }: SubscriptionStartedEmailProps) => (
    <EmailShell
      preview="Your CastleCare plan is active."
      title="Your care plan is active"
    >
      <Section className="px-7 py-7">
        <Text className="m-0 text-[15px] leading-[1.7] text-muted">
          Hi {customerName}, your recurring CastleCare plan is active. We will
          keep the schedule clear and send updates as each visit moves forward.
        </Text>
        <Section className="mt-5 rounded border border-solid border-border bg-soft px-5 py-2">
          <InfoRow label="Plan" value={planName} />
          <InfoRow label="Services" value={services.join(", ") || "Pending"} />
          <InfoRow
            label="Monthly plan"
            value={formatCents(recurringAmountCents)}
          />
          <InfoRow label="First visit" value={firstServiceWindow} />
        </Section>
        {dashboardUrl ? (
          <Section className="pt-6">
            <PrimaryButton href={dashboardUrl}>View my plan</PrimaryButton>
          </Section>
        ) : null}
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      customerName: "Cameron",
      dashboardUrl: castleCareUrl("/dashboard"),
      firstServiceWindow: "Friday, August 7, 10:00 AM-12:00 PM",
      planName: "Crown Estate Trio",
      recurringAmountCents: 50_000,
      services: ["Lawn Care", "Laundry", "Window Washing"],
    } satisfies SubscriptionStartedEmailProps,
  }
);

export default SubscriptionStartedEmail;
