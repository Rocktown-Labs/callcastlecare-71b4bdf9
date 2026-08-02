/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { castleCareUrl } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface AppointmentReminderEmailProps {
  address: string;
  appointmentWindow: string;
  customerName: string;
  manageUrl?: string;
  preparationNotes: string[];
  services: string[];
}

export const AppointmentReminderEmail = Object.assign(
  ({
    address = "Address pending",
    appointmentWindow = "your scheduled appointment window",
    customerName = "there",
    manageUrl = castleCareUrl("/dashboard"),
    preparationNotes = [],
    services = [],
  }: AppointmentReminderEmailProps) => (
    <EmailShell
      preview={`Reminder: your CastleCare appointment is ${appointmentWindow}.`}
      title="Your appointment is coming up"
    >
      <Section className="px-7 pb-7">
        <Text className="m-0 mb-5 text-[15px] leading-[1.7] text-muted">
          Hi {customerName}, this is a quick reminder for your upcoming
          CastleCare appointment.
        </Text>
        <Section className="rounded border border-solid border-border bg-soft px-5 py-2">
          <InfoRow label="Services" value={services.join(", ")} />
          <InfoRow label="Address" value={address} />
          <InfoRow label="Appointment window" value={appointmentWindow} />
        </Section>
        <Text className="m-0 mt-6 text-[15px] font-bold leading-[1.5] text-ink">
          Before we arrive
        </Text>
        {preparationNotes.map((note) => (
          <Text
            className="m-0 mt-2 text-[14px] leading-[1.6] text-muted"
            key={note}
          >
            - {note}
          </Text>
        ))}
        {manageUrl ? (
          <Section className="pt-6">
            <PrimaryButton href={manageUrl}>Manage appointment</PrimaryButton>
          </Section>
        ) : null}
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      address: "1200 Main Street, Little Rock, AR",
      appointmentWindow: "Tomorrow, 10:00 AM-12:00 PM",
      customerName: "Jordan",
      manageUrl: castleCareUrl("/dashboard/orders/1042"),
      preparationNotes: [
        "Make sure gates are unlocked and pets are secure.",
        "Leave laundry bags in the pickup spot you selected.",
      ],
      services: ["Groundskeeper Lawncare", "Royal Wash Laundry"],
    } satisfies AppointmentReminderEmailProps,
  }
);

export default AppointmentReminderEmail;
