export { emailCatalog } from "./catalog";
export {
  eventEmailDefinitions,
  getEventEmailDefinition,
  getServiceStatusEmailProps,
} from "./events";
export {
  renderActionEmail,
  renderEmail,
  renderServiceStatusUpdateEmail,
} from "./render";
export { emailTheme, formatCents } from "./theme";
export type { CastleCareEmailKey, EmailCatalogEntry } from "./catalog";
export type { ActionEmailProps } from "./templates/action-email";
export type { AppointmentReminderEmailProps } from "./templates/appointment-reminder";
export type { BookingReceivedEmailProps } from "./templates/booking-received";
export type { PaymentReceiptEmailProps } from "./templates/payment-receipt";
export type { ServiceStatusUpdateEmailProps } from "./templates/service-status-update";
