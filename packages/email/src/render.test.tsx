/* @jsxImportSource react */
import { describe, expect, it } from "vitest";

import {
  castleCareUrl,
  getEventEmailDefinition,
  getServiceStatusEmailProps,
  renderActionEmail,
  renderAdminBookingAlertEmail,
  renderBalanceInvoiceEmail,
  renderOtpEmail,
  renderProviderApplicationReceivedEmail,
  renderQuoteReviewNeededEmail,
  renderQuoteSavedEmail,
  renderServiceCompletedEmail,
  renderServiceStatusUpdateEmail,
  renderSubscriptionStartedEmail,
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
