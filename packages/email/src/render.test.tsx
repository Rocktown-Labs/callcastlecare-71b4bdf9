/* @jsxImportSource react */
import { describe, expect, it } from "vitest";

import {
  getEventEmailDefinition,
  renderActionEmail,
  renderOtpEmail,
  renderServiceStatusUpdateEmail,
} from "./index";

describe("email rendering", () => {
  it("renders accessible action email html and plain text", async () => {
    const rendered = await renderActionEmail({
      body: "Confirm this email address to finish setting up your CastleCare account.",
      buttonLabel: "Verify email",
      preview: "Verify your CastleCare email address.",
      title: "Verify your email",
      url: "https://callcastlecare.com/verify-email?token=test",
    });

    expect(rendered.html).toContain('lang="en"');
    expect(rendered.html).toContain("Verify your email");
    expect(rendered.text).toContain("Verify email");
    expect(rendered.text).toContain("https://callcastlecare.com/verify-email");
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
});
