/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { castleCareUrl } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface ServiceCompletedEmailProps {
  afterPhotosUrl?: string;
  customerName?: string;
  dashboardUrl?: string;
  orderLabel?: string;
  services?: string[];
  summary?: string;
}

export const ServiceCompletedEmail = Object.assign(
  ({
    afterPhotosUrl,
    customerName = "there",
    dashboardUrl = castleCareUrl("/dashboard"),
    orderLabel = "CastleCare order",
    services = [],
    summary = "Your CastleCare service is complete.",
  }: ServiceCompletedEmailProps) => {
    const actionUrl = afterPhotosUrl ?? dashboardUrl;
    const actionLabel = afterPhotosUrl
      ? "View after photos"
      : "View service details";

    return (
      <EmailShell
        preview="Your CastleCare service is complete."
        title="Your service is complete"
      >
        <Section className="px-7 py-7">
          <Text className="m-0 text-[15px] leading-[1.7] text-muted">
            Hi {customerName}, the work is wrapped up. We saved the service
            notes and any customer-facing photos with your order.
          </Text>
          <Section className="mt-5 rounded border border-solid border-border bg-soft px-5 py-2">
            <InfoRow label="Order" value={orderLabel} />
            <InfoRow
              label="Services"
              value={services.join(", ") || "Pending"}
            />
            <InfoRow label="Summary" value={summary} />
          </Section>
          {actionUrl ? (
            <Section className="pt-6">
              <PrimaryButton href={actionUrl}>{actionLabel}</PrimaryButton>
            </Section>
          ) : null}
        </Section>
      </EmailShell>
    );
  },
  {
    PreviewProps: {
      afterPhotosUrl: castleCareUrl("/dashboard/orders/1042"),
      customerName: "Cameron",
      orderLabel: "Order #1042",
      services: ["Lawn Care"],
      summary: "Mowing, edging, trimming, and cleanup are complete.",
    } satisfies ServiceCompletedEmailProps,
  }
);

export default ServiceCompletedEmail;
