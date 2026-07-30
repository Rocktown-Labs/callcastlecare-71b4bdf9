/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { castleCareUrl } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface QuoteSavedEmailProps {
  address?: string;
  bookingUrl?: string;
  customerName?: string;
  expiresLabel?: string;
  services?: string[];
}

export const QuoteSavedEmail = Object.assign(
  ({
    address = "Address saved with your quote",
    bookingUrl = castleCareUrl("/book"),
    customerName = "there",
    expiresLabel = "soon",
    services = [],
  }: QuoteSavedEmailProps) => (
    <EmailShell
      preview="Your CastleCare quote is saved. Pick up where you left off."
      title="Your quote is saved"
    >
      <Section className="px-7 py-7">
        <Text className="m-0 text-[15px] leading-[1.7] text-muted">
          Hi {customerName}, we saved your CastleCare quote so you can come back
          without starting over.
        </Text>
        <Section className="mt-5 rounded border border-solid border-border bg-soft px-5 py-2">
          <InfoRow label="Services" value={services.join(", ") || "Pending"} />
          <InfoRow label="Address" value={address} />
          <InfoRow label="Saved quote" value={`Available ${expiresLabel}`} />
        </Section>
        {bookingUrl ? (
          <Section className="pt-6">
            <PrimaryButton href={bookingUrl}>Finish my booking</PrimaryButton>
          </Section>
        ) : null}
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      address: "13 Cloverdale Boulevard, Searcy, AR",
      bookingUrl: castleCareUrl("/book/q/preview"),
      customerName: "Cameron",
      expiresLabel: "for the next 7 days",
      services: ["Lawn Care", "Window Washing"],
    } satisfies QuoteSavedEmailProps,
  }
);

export default QuoteSavedEmail;
