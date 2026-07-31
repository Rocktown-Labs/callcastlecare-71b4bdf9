export type CastleCareEmailKey =
  | "account-finalization"
  | "admin-booking-alert"
  | "appointment-reminder"
  | "balance-invoice"
  | "booking-received"
  | "email-verification"
  | "email-otp"
  | "password-reset"
  | "payment-receipt"
  | "provider-application-received"
  | "quote-review-needed"
  | "quote-saved"
  | "service-completed"
  | "service-status-update"
  | "subscription-started"
  | "tip-request";

export interface EmailCatalogEntry {
  audience: "admin" | "customer" | "provider";
  key: CastleCareEmailKey;
  purpose: string;
  subject: string;
  trigger: string;
  transactional: boolean;
}

export const emailCatalog = [
  {
    audience: "provider",
    key: "booking-received",
    purpose:
      "Confirm that CastleCare received the booking or quote request and set expectations for review, payment, and scheduling.",
    subject: "We received your CastleCare request",
    transactional: true,
    trigger: "Public booking submitted or quote request contact captured",
  },
  {
    audience: "customer",
    key: "quote-saved",
    purpose:
      "Bring a contact-captured quote request back to checkout without making the customer restart.",
    subject: "Your CastleCare quote is saved",
    transactional: true,
    trigger:
      "Quote request reaches contact capture but checkout is not complete",
  },
  {
    audience: "customer",
    key: "quote-review-needed",
    purpose:
      "Set expectations when a lawn, window, or combo quote needs manual review before payment or confirmation.",
    subject: "We are checking your CastleCare quote",
    transactional: true,
    trigger:
      "Property, photo, lot size, or service details require admin review",
  },
  {
    audience: "admin",
    key: "admin-booking-alert",
    purpose:
      "Notify the operator that a new checkout or quote needs review, confirmation, or follow-up.",
    subject: "New CastleCare booking to review",
    transactional: true,
    trigger: "Checkout starts, checkout succeeds, or quote review is requested",
  },
  {
    audience: "customer",
    key: "payment-receipt",
    purpose:
      "Record the deposit or full payment and clarify any remaining balance.",
    subject: "Your CastleCare payment receipt",
    transactional: true,
    trigger: "Checkout payment succeeds",
  },
  {
    audience: "customer",
    key: "balance-invoice",
    purpose:
      "Send the remaining service balance after completion or admin confirmation when the customer chose invoice later.",
    subject: "Your CastleCare balance is ready",
    transactional: true,
    trigger: "Admin creates a balance invoice or Stripe invoice is finalized",
  },
  {
    audience: "customer",
    key: "subscription-started",
    purpose:
      "Confirm a recurring CastleCare plan and show what services and schedule are included.",
    subject: "Your CastleCare plan is active",
    transactional: true,
    trigger: "Subscription checkout succeeds or recurring plan is activated",
  },
  {
    audience: "customer",
    key: "appointment-reminder",
    purpose:
      "Remind the customer of the 2-hour appointment window and service-specific preparation notes.",
    subject: "Reminder: your CastleCare appointment",
    transactional: true,
    trigger: "Scheduled reminder before appointment window",
  },
  {
    audience: "customer",
    key: "service-status-update",
    purpose:
      "Send operational updates such as provider assigned, started, arrived, delayed, completed, or cancelled.",
    subject: "CastleCare status update",
    transactional: true,
    trigger: "Outbox order status event",
  },
  {
    audience: "customer",
    key: "service-completed",
    purpose:
      "Close the loop after service with notes, customer-facing photos, and the next best action.",
    subject: "Your CastleCare service is complete",
    transactional: true,
    trigger: "Admin or provider marks the order complete",
  },
  {
    audience: "customer",
    key: "tip-request",
    purpose:
      "Ask the customer to choose None, a tip percentage, or a custom tip after the job is complete.",
    subject: "Add a tip for your CastleCare visit?",
    transactional: true,
    trigger: "Order completed when tip action is still needed",
  },
  {
    audience: "customer",
    key: "provider-application-received",
    purpose:
      "Confirm that a provider application was received and explain review status and next steps.",
    subject: "Your CastleCare application is in",
    transactional: true,
    trigger: "Earn/provider onboarding application is submitted",
  },
  {
    audience: "customer",
    key: "account-finalization",
    purpose:
      "Invite a booking customer to finish account setup after checkout so they can track status and future bookings.",
    subject: "Finish your CastleCare account",
    transactional: true,
    trigger: "Booking completion when no finalized account exists",
  },
  {
    audience: "customer",
    key: "email-verification",
    purpose: "Verify the email address used for CastleCare account access.",
    subject: "Verify your CastleCare email",
    transactional: true,
    trigger: "Better Auth verification event",
  },
  {
    audience: "customer",
    key: "email-otp",
    purpose:
      "Send one-time codes for passwordless sign-in, email verification, and password reset.",
    subject: "Your CastleCare code",
    transactional: true,
    trigger: "Better Auth email OTP event",
  },
  {
    audience: "customer",
    key: "password-reset",
    purpose:
      "Let a customer reset their password without revealing account state.",
    subject: "Reset your CastleCare password",
    transactional: true,
    trigger: "Better Auth password reset request",
  },
] satisfies EmailCatalogEntry[];
