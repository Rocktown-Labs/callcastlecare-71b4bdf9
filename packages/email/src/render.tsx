/* @jsxImportSource react */
import { render } from "@react-email/render";
import type { ReactElement } from "react";

import { ActionEmail } from "./templates/action-email";
import type { ActionEmailProps } from "./templates/action-email";
import { AdminBookingAlertEmail } from "./templates/admin-booking-alert";
import type { AdminBookingAlertEmailProps } from "./templates/admin-booking-alert";
import { BalanceInvoiceEmail } from "./templates/balance-invoice";
import type { BalanceInvoiceEmailProps } from "./templates/balance-invoice";
import { BookingReceivedEmail } from "./templates/booking-received";
import type { BookingReceivedEmailProps } from "./templates/booking-received";
import { OtpEmail } from "./templates/otp-email";
import type { OtpEmailProps } from "./templates/otp-email";
import { PaymentReceiptEmail } from "./templates/payment-receipt";
import type { PaymentReceiptEmailProps } from "./templates/payment-receipt";
import { ProviderApplicationReceivedEmail } from "./templates/provider-application-received";
import type { ProviderApplicationReceivedEmailProps } from "./templates/provider-application-received";
import { QuoteReviewNeededEmail } from "./templates/quote-review-needed";
import type { QuoteReviewNeededEmailProps } from "./templates/quote-review-needed";
import { QuoteSavedEmail } from "./templates/quote-saved";
import type { QuoteSavedEmailProps } from "./templates/quote-saved";
import { ServiceCompletedEmail } from "./templates/service-completed";
import type { ServiceCompletedEmailProps } from "./templates/service-completed";
import { ServiceStatusUpdateEmail } from "./templates/service-status-update";
import type { ServiceStatusUpdateEmailProps } from "./templates/service-status-update";
import { SubscriptionStartedEmail } from "./templates/subscription-started";
import type { SubscriptionStartedEmailProps } from "./templates/subscription-started";
import { TipRequestEmail } from "./templates/tip-request";
import type { TipRequestEmailProps } from "./templates/tip-request";
import { WelcomeEmail } from "./templates/welcome";
import type { WelcomeEmailProps } from "./templates/welcome";

interface RenderedEmail {
  html: string;
  text: string;
}

export const renderEmail = async (
  email: ReactElement
): Promise<RenderedEmail> => {
  const [html, text] = await Promise.all([
    render(email),
    render(email, { plainText: true }),
  ]);

  return { html, text };
};

export const renderActionEmail = (props: ActionEmailProps) =>
  renderEmail(<ActionEmail {...props} />);

export const renderAdminBookingAlertEmail = (
  props: AdminBookingAlertEmailProps
) => renderEmail(<AdminBookingAlertEmail {...props} />);

export const renderBalanceInvoiceEmail = (props: BalanceInvoiceEmailProps) =>
  renderEmail(<BalanceInvoiceEmail {...props} />);

export const renderBookingReceivedEmail = (props: BookingReceivedEmailProps) =>
  renderEmail(<BookingReceivedEmail {...props} />);

export const renderOtpEmail = (props: OtpEmailProps) =>
  renderEmail(<OtpEmail {...props} />);

export const renderPaymentReceiptEmail = (props: PaymentReceiptEmailProps) =>
  renderEmail(<PaymentReceiptEmail {...props} />);

export const renderProviderApplicationReceivedEmail = (
  props: ProviderApplicationReceivedEmailProps
) => renderEmail(<ProviderApplicationReceivedEmail {...props} />);

export const renderQuoteReviewNeededEmail = (
  props: QuoteReviewNeededEmailProps
) => renderEmail(<QuoteReviewNeededEmail {...props} />);

export const renderQuoteSavedEmail = (props: QuoteSavedEmailProps) =>
  renderEmail(<QuoteSavedEmail {...props} />);

export const renderServiceCompletedEmail = (
  props: ServiceCompletedEmailProps
) => renderEmail(<ServiceCompletedEmail {...props} />);

export const renderServiceStatusUpdateEmail = (
  props: ServiceStatusUpdateEmailProps
) => renderEmail(<ServiceStatusUpdateEmail {...props} />);

export const renderSubscriptionStartedEmail = (
  props: SubscriptionStartedEmailProps
) => renderEmail(<SubscriptionStartedEmail {...props} />);

export const renderTipRequestEmail = (props: TipRequestEmailProps) =>
  renderEmail(<TipRequestEmail {...props} />);

export const renderWelcomeEmail = (props: WelcomeEmailProps) =>
  renderEmail(<WelcomeEmail {...props} />);
