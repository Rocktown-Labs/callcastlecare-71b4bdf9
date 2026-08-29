import { CheckoutItemKind } from "@callcastlecare/api";
import { describe, expect, it } from "vitest";

import { computeCheckoutPreview, isRecurringCheckoutItem } from "./checkout";

describe("computeCheckoutPreview", () => {
  it("identifies recurring plan ids even when the client omits the flag", () => {
    expect(
      isRecurringCheckoutItem({
        itemKind: CheckoutItemKind.Lawncare,
        planId: "groundskeeper-monthly-medium",
        timingType: "scheduled",
      })
    ).toBe(true);
    expect(
      isRecurringCheckoutItem({
        itemKind: CheckoutItemKind.Lawncare,
        planId: "groundskeeper-one-time-medium",
        timingType: "scheduled",
      })
    ).toBe(false);
  });

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

    expect(preview.subtotalCents).toBe(52_500);
    expect(preview.technologyFeeCents).toBe(500);
    expect(preview.totalCents).toBe(53_000);
    expect(preview.lineItems[0]).toMatchObject({
      basePriceCents: 52_500,
      label: "Crown Estate Trio Medium",
      metadata: {
        comboServiceTypes: ["lawncare", "laundry", "window_washing"],
        planId: "crown-estate-trio-medium",
        pricingTier: "medium",
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

    expect(preview.subtotalCents).toBe(36_000);
    expect(preview.technologyFeeCents).toBe(500);
    expect(preview.totalCents).toBe(36_500);
    expect(preview.lineItems[0]).toMatchObject({
      basePriceCents: 36_000,
      label: "Royal Pane Bi-Annual Detail",
    });
  });

  it("recomputes travel fees instead of trusting a submitted fee", () => {
    const preview = computeCheckoutPreview({
      address: "123 Main St, Dallas, TX",
      items: [
        {
          itemKind: CheckoutItemKind.Laundry,
          planId: "royal-wash-basic",
          timingType: "scheduled",
        },
      ],
      travelDistanceMiles: 100,
      travelFeeCents: 0,
      travelStateCode: "TX",
    });

    expect(preview.travelFeeCents).toBe(10_000);
    expect(preview.totalCents).toBe(4000 + 500 + 10_000);
  });

  it("includes technology fee line item and calculates totals properly with travel fees and tips", () => {
    const preview = computeCheckoutPreview({
      address: "123 Main St, Fayetteville, AR",
      items: [
        {
          itemKind: CheckoutItemKind.Lawncare,
          planId: "groundskeeper-one-time-medium",
          timingType: "scheduled",
        },
      ],
      tipAmountCents: 1000,
      travelDistanceMiles: 100,
      travelStateCode: "AR",
    });

    expect(preview.subtotalCents).toBe(15_000);
    expect(preview.technologyFeeCents).toBe(500);
    expect(preview.travelFeeCents).toBe(5000);
    expect(preview.tipAmountCents).toBe(1000);
    expect(preview.totalCents).toBe(15_000 + 500 + 5000 + 1000);
    expect(preview.lineItems.map((li) => li.label)).toEqual([
      "Groundskeeper Medium Lot",
      "Technology fee",
      "Travel fee (in state)",
      "Tip",
    ]);
  });
});
