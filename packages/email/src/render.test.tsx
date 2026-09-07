/* @jsxImportSource react */
import { describe, expect, it } from "vitest";

import {
  castleCareUrl,
  getEventEmailDefinition,
  getServiceStatusEmailProps,
  renderActionEmail,
  renderAdminBookingAlertEmail,
  renderBalanceInvoiceEmail,
  renderBookingReceivedEmail,
  renderOtpEmail,
  renderPaymentReceiptEmail,
  renderProviderApplicationReceivedEmail,
  renderQuoteReviewNeededEmail,
  renderQuoteSavedEmail,
  renderServiceCompletedEmail,
  renderServiceStatusUpdateEmail,
  renderSubscriptionStartedEmail,
  renderWelcomeEmail,
} from "./index";

describe("email rendering", () => {
  it("renders accessible action email html and plain text", async () => {
    const rendered = await renderActionEmail({
      body: "Confirm this email address to finish setting up your CastleCare account.",
      buttonLabel: "Verify email",
      preview: "Verify your CastleCare email address.",
      title: "Verify your email",
      url: castleCareUrl("/verify-email?token=test"),
    });

    expect(rendered.html).toContain('lang="en"');
    expect(rendered.html).toContain("Verify your email");
    expect(rendered.text).toContain("Verify email");
    expect(rendered.text).toContain(
      "https://www.callcastlecare.com/verify-email"
    );
  });

  it("renders one-time password emails with the code", async () => {
    const rendered = await renderOtpEmail({
      body: "Use this one-time code to continue with CastleCare.",
      code: "123456",
      preview: "Your CastleCare verification code.",
      title: "Your CastleCare code",
    });

    expect(rendered.html).toContain("123456");
    expect(rendered.text).toContain("123456");
    expect(rendered.text).toContain("This code expires soon.");
  });

  it("maps status events to customer-safe copy", async () => {
    const definition = getEventEmailDefinition("driver_arrived");
    const rendered = await renderServiceStatusUpdateEmail({
      body: definition.body,
      orderLabel: "Order #42",
      statusLabel: definition.statusLabel,
    });

    expect(definition.subject).toBe("Provider arrived");
    expect(rendered.text).toContain("Your provider has arrived.");
    expect(rendered.text).toContain("Order #42");
  });

  it("renders customer lifecycle emails", async () => {
    const [quoteSaved, quoteReview, balanceInvoice, serviceCompleted] =
      await Promise.all([
        renderQuoteSavedEmail({
          bookingUrl: castleCareUrl("/book/q/test"),
          customerName: "Jordan",
          services: ["Lawn Care"],
        }),
        renderQuoteReviewNeededEmail({
          customerName: "Jordan",
          reason: "The lot size needs a quick check.",
          services: ["Lawn Care"],
        }),
        renderBalanceInvoiceEmail({
          amountDueCents: 12_500,
          customerName: "Jordan",
          orderLabel: "Order #42",
        }),
        renderServiceCompletedEmail({
          afterPhotosUrl: castleCareUrl("/dashboard/orders/42"),
          customerName: "Jordan",
          orderLabel: "Order #42",
          services: ["Window Washing"],
        }),
      ]);

    expect(quoteSaved.text).toContain("YOUR QUOTE IS SAVED");
    expect(quoteReview.text).toContain("WE ARE CHECKING YOUR QUOTE");
    expect(balanceInvoice.text).toContain("$125.00");
    expect(serviceCompleted.text).toContain("YOUR SERVICE IS COMPLETE");
    expect(serviceCompleted.text).toContain(
      "https://www.callcastlecare.com/dashboard/orders/42"
    );
  });

  it("renders operator, subscription, and provider emails", async () => {
    const [adminAlert, subscription, providerApplication] = await Promise.all([
      renderAdminBookingAlertEmail({
        adminUrl: castleCareUrl("/admin/orders/42"),
        amountDueCents: 5000,
        customerEmail: "customer@example.com",
        customerName: "Jordan",
        services: ["Laundry"],
      }),
      renderSubscriptionStartedEmail({
        customerName: "Jordan",
        planName: "Crown Estate Trio",
        recurringAmountCents: 50_000,
      }),
      renderProviderApplicationReceivedEmail({
        applicantName: "Taylor",
        services: ["Lawn Care"],
      }),
    ]);

    expect(adminAlert.text).toContain("NEW BOOKING TO REVIEW");
    expect(subscription.text).toContain("Crown Estate Trio");
    expect(providerApplication.text).toContain("Your application is in");
  });

  it("renders booking received, payment receipt, and welcome emails", async () => {
    const [bookingReceived, paymentReceipt, welcome] = await Promise.all([
      renderBookingReceivedEmail({
        address: "1200 Main Street, Little Rock, AR",
        appointmentWindow: "Friday, August 7, 10:00 AM-12:00 PM",
        customerName: "Jordan",
        dashboardUrl: castleCareUrl("/dashboard/orders/1042"),
        depositCents: 5000,
        orderLabel: "Order #1042",
        paymentChoice: "Deposit today, invoice later",
        services: ["Groundskeeper Lawncare"],
        totalCents: 18_500,
      }),
      renderPaymentReceiptEmail({
        amountPaidCents: 5000,
        customerName: "Jordan",
        dashboardUrl: castleCareUrl("/dashboard/orders/1042"),
        paymentChoice: "Deposit today, invoice later",
        receiptLabel: "CastleCare deposit",
        remainingBalanceCents: 13_500,
        services: ["Groundskeeper Lawncare"],
        totalCents: 18_500,
      }),
      renderWelcomeEmail({
        customerName: "Jordan",
        dashboardUrl: castleCareUrl("/dashboard"),
        services: ["Lawn Care", "Laundry Pickup", "Window Washing"],
      }),
    ]);

    expect(bookingReceived.text).toContain("BOOKING CONFIRMED (ORDER #1042)");
    expect(bookingReceived.text).toContain("Order #1042");
    expect(bookingReceived.text).toContain("1200 Main Street");
    expect(bookingReceived.text).toContain("$50.00");

    expect(paymentReceipt.text).toContain("PAYMENT RECEIVED");
    expect(paymentReceipt.text).toContain("$50.00");
    expect(paymentReceipt.text).toContain("$135.00");

    expect(welcome.text).toContain("WELCOME TO CASTLECARE");
    expect(welcome.text).toContain("welcome to CastleCare!");
    expect(welcome.text).toContain("https://www.callcastlecare.com/dashboard");
  });

  it("keeps template links on existing customer and operator routes", async () => {
    const rendered = await Promise.all([
      renderQuoteSavedEmail({}),
      renderQuoteReviewNeededEmail({}),
      renderBalanceInvoiceEmail({
        invoiceUrl: "https://invoice.stripe.com/i/acct_preview/test",
      }),
      renderServiceCompletedEmail({
        afterPhotosUrl: castleCareUrl("/dashboard/orders/42"),
      }),
      renderAdminBookingAlertEmail({}),
      renderProviderApplicationReceivedEmail({}),
    ]);
    const combinedText = rendered.map((email) => email.text).join("\n");

    expect(combinedText).toContain("https://www.callcastlecare.com/book");
    expect(combinedText).toContain("https://www.callcastlecare.com/dashboard");
    expect(combinedText).toContain(
      "https://www.callcastlecare.com/dashboard/orders/42"
    );
    expect(combinedText).toContain("https://www.callcastlecare.com/admin");
    expect(combinedText).toContain("https://www.callcastlecare.com/earn");
    expect(combinedText).not.toContain("/drive");
  });

  it("deep-links status emails to the customer order when an order id exists", () => {
    const props = getServiceStatusEmailProps({
      body: "Your provider has arrived.",
      orderId: 42,
      statusLabel: "Provider arrived",
    });

    expect(props.statusUrl).toBe(
      "https://www.callcastlecare.com/dashboard/orders/42"
    );
  });
});
