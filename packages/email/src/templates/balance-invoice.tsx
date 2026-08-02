/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { formatCents } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface BalanceInvoiceEmailProps {
  amountDueCents?: number;
  customerName?: string;
  invoiceUrl?: string;
  orderLabel?: string;
  services?: string[];
}

export const BalanceInvoiceEmail = Object.assign(
  ({
    amountDueCents = 0,
    customerName = "there",
    invoiceUrl,
    orderLabel = "CastleCare order",
    services = [],
  }: BalanceInvoiceEmailProps) => (
    <EmailShell
      preview={`Your remaining CastleCare balance is ${formatCents(amountDueCents)}.`}
      title="Your remaining balance is ready"
    >
      <Section className="px-7 py-7">
        <Text className="m-0 text-[15px] leading-[1.7] text-muted">
          Hi {customerName}, your service balance is ready. You can pay online
          from the invoice page, or follow the payment choice attached to your
          booking.
        </Text>
        <Section className="mt-5 rounded border border-solid border-border bg-soft px-5 py-2">
          <InfoRow label="Order" value={orderLabel} />
          <InfoRow label="Services" value={services.join(", ") || "Pending"} />
          <InfoRow label="Balance due" value={formatCents(amountDueCents)} />
        </Section>
        {invoiceUrl ? (
          <Section className="pt-6">
            <PrimaryButton href={invoiceUrl}>Pay balance</PrimaryButton>
          </Section>
        ) : null}
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      amountDueCents: 21_000,
      customerName: "Cameron",
      invoiceUrl: "https://invoice.stripe.com/preview",
      orderLabel: "Order #1042",
      services: ["Lawn Care", "Window Washing"],
    } satisfies BalanceInvoiceEmailProps,
  }
);

export default BalanceInvoiceEmail;
