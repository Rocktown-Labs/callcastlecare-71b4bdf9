export type HomePricingTier = "small" | "medium" | "large";

const HOME_TIER_PRICES: Record<HomePricingTier, number> = {
  large: 360_000,
  medium: 240_000,
  small: 150_000,
};

export interface HomeQuotePricing {
  confidenceScore: number;
  pricingTier: HomePricingTier;
  totalPriceCents: number;
}

export const computeHomeQuotePricing = (
  homeSqft: number | null,
  lotSizeSqft: number | null,
  fallbackUsed: boolean
): HomeQuotePricing => {
  const normalizedHomeSqft = homeSqft ?? 2000;
  const normalizedLotSizeSqft = lotSizeSqft ?? 10_000;

  const tier: HomePricingTier =
    normalizedLotSizeSqft > 20_000 || normalizedHomeSqft > 3500
      ? "large"
      : normalizedLotSizeSqft > 10_000 || normalizedHomeSqft > 2200
        ? "medium"
        : "small";

  const confidenceScore = fallbackUsed ? 0.45 : 0.92;

  return {
    confidenceScore,
    pricingTier: tier,
    totalPriceCents: HOME_TIER_PRICES[tier],
  };
};
