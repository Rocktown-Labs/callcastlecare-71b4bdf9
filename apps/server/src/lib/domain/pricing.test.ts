import {
  calculateTravelFeeCents,
  calculateWindowWashingQuote,
  getLawncareLotTier,
  getLawncarePlanId,
} from "@callcastlecare/api";
import { describe, expect, it } from "vitest";

describe("pricing", () => {
  it("maps lawn lot acreage to the launch pricing tiers", () => {
    expect(getLawncareLotTier(0.25)).toBe("small");
    expect(getLawncareLotTier(0.55)).toBe("medium");
    expect(getLawncareLotTier(1)).toBe("large");
    expect(getLawncareLotTier(2.01)).toBe("custom");
  });

  it("resolves lawncare plan ids from frequency and acreage", () => {
    expect(
      getLawncarePlanId({ frequency: "one_time", lotSizeAcres: 0.5 })
    ).toBe("groundskeeper-one-time");
    expect(
      getLawncarePlanId({ frequency: "one_time", lotSizeAcres: 0.75 })
    ).toBe("groundskeeper-one-time-medium");
    expect(
      getLawncarePlanId({ frequency: "bi_weekly", lotSizeAcres: 1.2 })
    ).toBe("groundskeeper-bi-weekly-large");
    expect(getLawncarePlanId({ frequency: "monthly", lotSizeAcres: 2.5 })).toBe(
      "groundskeeper-custom-quote-deposit"
    );
  });

  it("charges travel only after the included service radius", () => {
    expect(calculateTravelFeeCents(55)).toBe(0);
    expect(calculateTravelFeeCents(55.1)).toBe(200);
    expect(calculateTravelFeeCents(60)).toBe(1000);
  });

  it("uses the launch window washing rates and default pane estimate", () => {
    const residential = calculateWindowWashingQuote({
      cleanScreens: false,
      packageType: "EXTERIOR_ONLY",
      propertyType: "residential",
      stories: 1,
    });
    const commercial = calculateWindowWashingQuote({
      cleanScreens: false,
      packageType: "FULL_SERVICE",
      propertyType: "commercial",
      stories: 1,
    });

    expect(residential.estimatedPanes).toBe(20);
    expect(residential.cents.finalPriceCents).toBe(10_000);
    expect(commercial.ratePerPane).toBe(15);
    expect(commercial.cents.finalPriceCents).toBe(30_000);
  });
});
