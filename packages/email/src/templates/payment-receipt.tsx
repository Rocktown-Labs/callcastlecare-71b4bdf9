/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { formatCents } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface PaymentReceiptEmailProps {
  amountPaidCents: number;
  customerName: string;
  dashboardUrl?: string;
  paymentChoice: string;
  receiptLabel: string;
  remainingBalanceCents: number;
  services: string[];
  totalCents: number;
}

export const PaymentReceiptEmail = Object.assign(
  ({
    amountPaidCents,
    customerName,
    dashboardUrl,
    paymentChoice,
    receiptLabel,
    remainingBalanceCents,
    services,
    totalCents,
  }: PaymentReceiptEmailProps) => (
    <EmailShell
      preview={`We received ${formatCents(amountPaidCents)} for your CastleCare booking.`}
      title="Payment received"
    >
      <Section className="px-7 pb-7">
        <Text className="m-0 mb-5 text-[15px] leading-[1.7] text-muted">
          Hi {customerName}, your payment is recorded and your CastleCare visit
          is moving forward.
        </Text>
        <Section className="rounded border border-solid border-border bg-soft px-5 py-2">
          <InfoRow label="Receipt" value={receiptLabel} />
          <InfoRow label="Services" value={services.join(", ")} />
          <InfoRow label="Payment choice" value={paymentChoice} />
          <InfoRow label="Paid today" value={formatCents(amountPaidCents)} />
          <InfoRow label="Estimated total" value={formatCents(totalCents)} />
          <InfoRow
            label="Remaining balance"
            value={formatCents(remainingBalanceCents)}
          />
        </Section>
        {dashboardUrl ? (
          <Section className="pt-6">
            <PrimaryButton href={dashboardUrl}>
              View receipt details
            </PrimaryButton>
          </Section>
        ) : null}
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      amountPaidCents: 5000,
      customerName: "Jordan",
      dashboardUrl: "https://callcastlecare.com/dashboard",
      paymentChoice: "Deposit today, invoice later",
      receiptLabel: "CastleCare deposit",
      remainingBalanceCents: 13_500,
      services: ["Groundskeeper Lawncare", "Royal Pane Window Washing"],
      totalCents: 18_500,
    } satisfies PaymentReceiptEmailProps,
  }
);

export default PaymentReceiptEmail;
