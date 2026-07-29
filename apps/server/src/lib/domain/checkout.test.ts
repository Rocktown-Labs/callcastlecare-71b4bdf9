import { CheckoutItemKind } from "@callcastlecare/api";
import { describe, expect, it } from "vitest";

import { computeCheckoutPreview } from "./checkout";

describe("computeCheckoutPreview", () => {
  it("prices combo subscription plan ids directly", () => {
    const preview = computeCheckoutPreview({
      address: "123 Main St, Little Rock, AR",
      items: [
        {
          frequency: "monthly",
          isSubscription: true,
          itemKind: CheckoutItemKind.Lawncare,
          planId: "crown-estate-trio-medium",
          timingType: "scheduled",
        },
      ],
    });

    expect(preview.totalCents).toBe(52_500);
    expect(preview.lineItems[0]).toMatchObject({
      basePriceCents: 52_500,
      label: "Crown Estate Trio Medium",
      metadata: {
        planId: "crown-estate-trio-medium",
        serviceType: "combo",
      },
    });
  });

  it("prices recurring window washing plan ids without falling back to the one-time quote", () => {
    const preview = computeCheckoutPreview({
      address: "123 Main St, Little Rock, AR",
      items: [
        {
          itemKind: CheckoutItemKind.WindowWashing,
          planId: "royal-pane-bi-annual",
          timingType: "scheduled",
        },
      ],
    });

    expect(preview.totalCents).toBe(36_000);
    expect(preview.lineItems[0]).toMatchObject({
      basePriceCents: 36_000,
      label: "Royal Pane Bi-Annual Detail",
    });
  });
});
