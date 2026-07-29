export type CastleCareEmailKey =
  | "account-finalization"
  | "appointment-reminder"
  | "booking-received"
  | "email-verification"
  | "email-otp"
  | "password-reset"
  | "payment-receipt"
  | "service-status-update";

export interface EmailCatalogEntry {
  audience: "customer" | "admin";
  key: CastleCareEmailKey;
  purpose: string;
  subject: string;
  trigger: string;
  transactional: boolean;
}

export const emailCatalog = [
  {
    audience: "customer",
    key: "booking-received",
    purpose:
      "Confirm that CastleCare received the booking or quote request and set expectations for review, payment, and scheduling.",
    subject: "We received your CastleCare request",
    transactional: true,
    trigger: "Public booking submitted or quote request contact captured",
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
