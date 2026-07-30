/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { castleCareUrl, formatCents } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface AdminBookingAlertEmailProps {
  address?: string;
  adminUrl?: string;
  amountDueCents?: number;
  appointmentWindow?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  services?: string[];
}

export const AdminBookingAlertEmail = Object.assign(
  ({
    address = "Address pending",
    adminUrl = castleCareUrl("/admin"),
    amountDueCents = 0,
    appointmentWindow = "Appointment window pending",
    customerEmail = "Email pending",
    customerName = "Customer",
    customerPhone = "Phone pending",
    services = [],
  }: AdminBookingAlertEmailProps) => (
    <EmailShell
      preview="A CastleCare booking needs admin review."
      title="New booking to review"
    >
      <Section className="px-7 py-7">
        <Text className="m-0 text-[15px] leading-[1.7] text-muted">
          A customer reached checkout. Review the order, confirm the schedule,
          and decide whether anything needs a manual quote check.
        </Text>
        <Section className="mt-5 rounded border border-solid border-border bg-soft px-5 py-2">
          <InfoRow label="Customer" value={customerName} />
          <InfoRow label="Email" value={customerEmail} />
          <InfoRow label="Phone" value={customerPhone} />
          <InfoRow label="Services" value={services.join(", ") || "Pending"} />
          <InfoRow label="Address" value={address} />
          <InfoRow label="Window" value={appointmentWindow} />
          <InfoRow label="Due today" value={formatCents(amountDueCents)} />
        </Section>
        {adminUrl ? (
          <Section className="pt-6">
            <PrimaryButton href={adminUrl}>Open admin order</PrimaryButton>
          </Section>
        ) : null}
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      address: "13 Cloverdale Boulevard, Searcy, AR",
      adminUrl: castleCareUrl("/admin/orders/1042"),
      amountDueCents: 5000,
      appointmentWindow: "Friday, August 7, 10:00 AM-12:00 PM",
      customerEmail: "customer@example.com",
      customerName: "Cameron Stewart",
      customerPhone: "(501)-827-1551",
      services: ["Lawn Care", "Laundry", "Window Washing"],
    } satisfies AdminBookingAlertEmailProps,
  }
);

export default AdminBookingAlertEmail;
