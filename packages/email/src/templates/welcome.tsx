/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { castleCareUrl } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface WelcomeEmailProps {
  customerName?: string;
  dashboardUrl?: string;
  services?: string[];
}

export const WelcomeEmail = Object.assign(
  ({
    customerName = "there",
    dashboardUrl = castleCareUrl("/dashboard"),
    services = ["Lawn Care", "Laundry Pickup", "Window Washing"],
  }: WelcomeEmailProps) => (
    <EmailShell
      preview="Welcome to CastleCare. Your home care services dashboard is ready."
      title="Welcome to CastleCare"
    >
      <Section className="px-7 pb-7">
        <Text className="m-0 mb-5 text-[15px] leading-[1.7] text-muted">
          Hi {customerName}, welcome to CastleCare! Your customer account is set
          up and ready. You can now manage your appointments, track service
          visits, and view invoices all in one place.
        </Text>
        <Section className="rounded border border-solid border-border bg-soft px-5 py-2">
          <InfoRow label="Available Services" value={services.join(", ")} />
          <InfoRow label="Coverage" value="Arkansas" />
          <InfoRow label="Support" value="help@callcastlecare.com" />
        </Section>
        {dashboardUrl ? (
          <Section className="pt-6">
            <PrimaryButton href={dashboardUrl}>
              Open your dashboard
            </PrimaryButton>
          </Section>
        ) : null}
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      customerName: "Cameron",
      dashboardUrl: castleCareUrl("/dashboard"),
      services: ["Lawn Care", "Laundry Pickup", "Window Washing"],
    } satisfies WelcomeEmailProps,
  }
);

export default WelcomeEmail;
