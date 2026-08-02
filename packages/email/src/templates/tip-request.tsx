/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { castleCareUrl } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface TipRequestEmailProps {
  customerName?: string;
  orderLabel?: string;
  services?: string[];
  tipUrl?: string;
  totalLabel?: string;
}

export const TipRequestEmail = Object.assign(
  ({
    customerName = "there",
    orderLabel = "CastleCare order",
    services = [],
    tipUrl = castleCareUrl("/dashboard"),
    totalLabel = "your service total",
  }: TipRequestEmailProps) => (
    <EmailShell
      preview="Add a tip for your CastleCare pro if the job went well."
      title="Want to leave a tip?"
    >
      <Section className="px-7 py-7">
        <Text className="m-0 text-[15px] leading-[1.7] text-muted">
          Hi {customerName}, your service is complete. Tips are optional, but we
          ask every customer to make a choice so we can close out the visit.
        </Text>
        <Section className="mt-5 rounded border border-solid border-border bg-soft px-5 py-2">
          <InfoRow label="Order" value={orderLabel} />
          <InfoRow label="Services" value={services.join(", ") || "Pending"} />
          <InfoRow label="Based on" value={totalLabel} />
        </Section>
        <Text className="mt-5 m-0 text-[15px] leading-[1.7] text-muted">
          You can choose None, a percentage, or a custom amount. You have one
          hour after completion to flag a problem before tips are released.
        </Text>
        <Section className="pt-6">
          <PrimaryButton href={tipUrl}>Choose tip amount</PrimaryButton>
        </Section>
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      customerName: "Cameron",
      orderLabel: "Order #1042",
      services: ["Lawn Care", "Window Washing"],
      tipUrl: castleCareUrl("/dashboard/orders/1042?tip=1"),
      totalLabel: "$175.00",
    } satisfies TipRequestEmailProps,
  }
);

export default TipRequestEmail;
