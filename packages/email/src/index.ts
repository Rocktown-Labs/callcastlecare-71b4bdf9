export { emailCatalog } from "./catalog";
export {
  eventEmailDefinitions,
  getEventEmailDefinition,
  getServiceStatusEmailProps,
} from "./events";
export {
  renderActionEmail,
  renderAdminBookingAlertEmail,
  renderBalanceInvoiceEmail,
  renderEmail,
  renderOtpEmail,
  renderProviderApplicationReceivedEmail,
  renderQuoteReviewNeededEmail,
  renderQuoteSavedEmail,
  renderServiceCompletedEmail,
  renderServiceStatusUpdateEmail,
  renderSubscriptionStartedEmail,
} from "./render";
export { castleCareUrl, emailTheme, formatCents } from "./theme";
export type { CastleCareEmailKey, EmailCatalogEntry } from "./catalog";
export type { ActionEmailProps } from "./templates/action-email";
export type { AdminBookingAlertEmailProps } from "./templates/admin-booking-alert";
export type { AppointmentReminderEmailProps } from "./templates/appointment-reminder";
export type { BalanceInvoiceEmailProps } from "./templates/balance-invoice";
export type { BookingReceivedEmailProps } from "./templates/booking-received";
export type { OtpEmailProps } from "./templates/otp-email";
export type { PaymentReceiptEmailProps } from "./templates/payment-receipt";
export type { ProviderApplicationReceivedEmailProps } from "./templates/provider-application-received";
export type { QuoteReviewNeededEmailProps } from "./templates/quote-review-needed";
export type { QuoteSavedEmailProps } from "./templates/quote-saved";
export type { ServiceCompletedEmailProps } from "./templates/service-completed";
export type { ServiceStatusUpdateEmailProps } from "./templates/service-status-update";
export type { SubscriptionStartedEmailProps } from "./templates/subscription-started";
