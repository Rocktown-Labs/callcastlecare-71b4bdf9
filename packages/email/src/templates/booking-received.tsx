/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { formatCents } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface BookingReceivedEmailProps {
  address: string;
  appointmentWindow: string;
  customerName: string;
  dashboardUrl?: string;
  depositCents: number;
  paymentChoice: string;
  services: string[];
  totalCents: number;
}

export const BookingReceivedEmail = Object.assign(
  ({
    address,
    appointmentWindow,
    customerName,
    dashboardUrl,
    depositCents,
    paymentChoice,
    services,
    totalCents,
  }: BookingReceivedEmailProps) => (
    <EmailShell
      preview="We received your CastleCare booking details and are preparing your service."
      title="Your CastleCare request is in"
    >
      <Section className="px-7 pb-7">
        <Text className="m-0 mb-5 text-[15px] leading-[1.7] text-muted">
          Hi {customerName}, we have your request and the details needed to
          prepare the visit. A CastleCare coordinator will review anything that
          needs a quote check before your appointment is confirmed.
        </Text>
        <Section className="rounded border border-solid border-border bg-soft px-5 py-2">
          <InfoRow label="Services" value={services.join(", ")} />
          <InfoRow label="Address" value={address} />
          <InfoRow label="Appointment window" value={appointmentWindow} />
          <InfoRow label="Payment choice" value={paymentChoice} />
          <InfoRow label="Estimated total" value={formatCents(totalCents)} />
          <InfoRow label="Deposit" value={formatCents(depositCents)} />
        </Section>
        {dashboardUrl ? (
          <Section className="pt-6">
            <PrimaryButton href={dashboardUrl}>
              View booking status
            </PrimaryButton>
          </Section>
        ) : null}
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      address: "1200 Main Street, Little Rock, AR",
      appointmentWindow: "Friday, August 7, 10:00 AM-12:00 PM",
      customerName: "Jordan",
      dashboardUrl: "https://callcastlecare.com/dashboard",
      depositCents: 5000,
      paymentChoice: "Deposit today, invoice later",
      services: ["Groundskeeper Lawncare", "Royal Pane Window Washing"],
      totalCents: 18_500,
    } satisfies BookingReceivedEmailProps,
  }
);

export default BookingReceivedEmail;
