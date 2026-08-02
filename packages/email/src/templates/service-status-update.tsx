/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { castleCareUrl } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface ServiceStatusUpdateEmailProps {
  body: string;
  customerName?: string;
  orderLabel?: string;
  statusLabel: string;
  statusUrl?: string;
}

export const ServiceStatusUpdateEmail = Object.assign(
  ({
    body,
    customerName,
    orderLabel,
    statusLabel,
    statusUrl = castleCareUrl("/dashboard"),
  }: ServiceStatusUpdateEmailProps) => {
    const greeting = customerName ? `Hi ${customerName},` : "Hi,";

    return (
      <EmailShell
        preview={`${statusLabel}: ${body}`}
        title="CastleCare status update"
      >
        <Section className="px-7 pb-7">
          <Text className="m-0 text-[15px] leading-[1.7] text-muted">
            {greeting}
          </Text>
          <Text className="m-0 mt-3 text-[15px] leading-[1.7] text-muted">
            {body}
          </Text>
          <Section className="mt-5 rounded border border-solid border-border bg-soft px-5 py-2">
            <InfoRow label="Status" value={statusLabel} />
            {orderLabel ? <InfoRow label="Order" value={orderLabel} /> : null}
          </Section>
          {statusUrl ? (
            <Section className="pt-6">
              <PrimaryButton href={statusUrl}>View order details</PrimaryButton>
            </Section>
          ) : null}
        </Section>
      </EmailShell>
    );
  },
  {
    PreviewProps: {
      body: "Your provider has arrived and is ready to begin the service.",
      customerName: "Jordan",
      orderLabel: "Order #1042",
      statusLabel: "Provider arrived",
      statusUrl: castleCareUrl("/dashboard/orders/1042"),
    } satisfies ServiceStatusUpdateEmailProps,
  }
);

export default ServiceStatusUpdateEmail;
