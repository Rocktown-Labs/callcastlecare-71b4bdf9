/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { castleCareUrl } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface ProviderApplicationReceivedEmailProps {
  applicantName?: string;
  dashboardUrl?: string;
  planName?: string;
  serviceAreas?: string[];
  services?: string[];
}

export const ProviderApplicationReceivedEmail = Object.assign(
  ({
    applicantName = "there",
    dashboardUrl = castleCareUrl("/earn"),
    planName = "Standard Provider",
    serviceAreas = [],
    services = [],
  }: ProviderApplicationReceivedEmailProps) => (
    <EmailShell
      preview="We received your CastleCare provider application."
      title="Your application is in"
    >
      <Section className="px-7 py-7">
        <Text className="m-0 text-[15px] leading-[1.7] text-muted">
          Hi {applicantName}, thanks for applying to provide CastleCare service.
          Your application is in review, and we will keep the next steps clear
          as provider coverage opens.
        </Text>
        <Section className="mt-5 rounded border border-solid border-border bg-soft px-5 py-2">
          <InfoRow label="Path" value={planName} />
          <InfoRow label="Jobs" value={services.join(", ") || "Pending"} />
          <InfoRow
            label="Service areas"
            value={serviceAreas.join(", ") || "Pending"}
          />
        </Section>
        {dashboardUrl ? (
          <Section className="pt-6">
            <PrimaryButton href={dashboardUrl}>View application</PrimaryButton>
          </Section>
        ) : null}
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      applicantName: "Taylor",
      dashboardUrl: castleCareUrl("/earn"),
      planName: "CastleCare Pro",
      serviceAreas: ["Searcy", "Little Rock"],
      services: ["Lawn Care", "Laundry Pickup", "Window Washing"],
    } satisfies ProviderApplicationReceivedEmailProps,
  }
);

export default ProviderApplicationReceivedEmail;
