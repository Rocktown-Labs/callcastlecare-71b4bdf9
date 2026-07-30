/* @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { castleCareUrl } from "../theme";
import { EmailShell, InfoRow, PrimaryButton } from "./components";

export interface QuoteReviewNeededEmailProps {
  address?: string;
  customerName?: string;
  reason?: string;
  reviewUrl?: string;
  services?: string[];
}

export const QuoteReviewNeededEmail = Object.assign(
  ({
    address = "Address pending",
    customerName = "there",
    reason = "A detail in the request needs a quick human review.",
    reviewUrl = castleCareUrl("/dashboard"),
    services = [],
  }: QuoteReviewNeededEmailProps) => (
    <EmailShell
      preview="We are reviewing your CastleCare quote before checkout."
      title="We are checking your quote"
    >
      <Section className="px-7 py-7">
        <Text className="m-0 text-[15px] leading-[1.7] text-muted">
          Hi {customerName}, your request is in. We are checking the details so
          the price and appointment window stay realistic before you pay.
        </Text>
        <Section className="mt-5 rounded border border-solid border-border bg-soft px-5 py-2">
          <InfoRow label="Services" value={services.join(", ") || "Pending"} />
          <InfoRow label="Address" value={address} />
          <InfoRow label="Review note" value={reason} />
        </Section>
        {reviewUrl ? (
          <Section className="pt-6">
            <PrimaryButton href={reviewUrl}>View quote status</PrimaryButton>
          </Section>
        ) : null}
      </Section>
    </EmailShell>
  ),
  {
    PreviewProps: {
      address: "13 Cloverdale Boulevard, Searcy, AR",
      customerName: "Cameron",
      reason:
        "The lot size needs a quick check before we confirm lawn pricing.",
      reviewUrl: castleCareUrl("/dashboard"),
      services: ["Lawn Care", "Window Washing"],
    } satisfies QuoteReviewNeededEmailProps,
  }
);

export default QuoteReviewNeededEmail;
