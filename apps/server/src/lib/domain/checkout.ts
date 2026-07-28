/* eslint-disable max-statements, no-nested-ternary */
import type {
  CheckoutPreviewItemInput,
  CheckoutPreviewLineItem,
  CheckoutPreviewRequest,
  TimingType,
} from "@callcastlecare/api";
import {
  HOME_PREORDER_DEPOSIT_CENTS,
  LAUNDRY_PLAN_LABELS,
  LAUNDRY_PLAN_PRICES,
  LAWNCARE_PLAN_LABELS,
  LAWNCARE_PLAN_PRICES,
  calculateWindowWashingQuote,
  getLawncarePricingTier,
} from "@callcastlecare/api";

type PricingTier = "custom" | "large" | "medium" | "small";

const parsePlanPrice = (
  item: CheckoutPreviewItemInput
): {
  basePriceCents: number;
  label: string;
  pricingTier?: PricingTier;
  serviceType?: "lawncare" | "laundry" | "window_washing";
  windowWashingQuote?: ReturnType<typeof calculateWindowWashingQuote>;
} => {
  if (item.itemKind === "window_washing") {
    const quote = calculateWindowWashingQuote({
      cleanScreens: item.cleanScreens ?? false,
      livingArea: item.livingArea ?? 1400,
      packageType: item.packageType ?? "EXTERIOR_ONLY",
      paneCount: item.paneCount,
      propertyType: item.propertyType ?? "residential",
      stories: item.stories ?? 1,
    });
    return {
      basePriceCents: quote.cents.finalPriceCents,
      label: `Window Washing - ${item.packageType === "FULL_SERVICE" ? "Inside & Out" : "Exterior Only"} (${quote.estimatedPanes} panes)`,
      serviceType: "window_washing",
      windowWashingQuote: quote,
    };
  }

  if (item.itemKind === "home_preorder") {
    return {
      basePriceCents: HOME_PREORDER_DEPOSIT_CENTS,
      label: "Home Project Deposit",
    };
  }

  if (!item.planId) {
    throw new Error(`planId is required for ${item.itemKind}`);
  }

  if (item.itemKind === "lawncare") {
    const lawncarePrice =
      LAWNCARE_PLAN_PRICES[item.planId as keyof typeof LAWNCARE_PLAN_PRICES];

    if (!lawncarePrice) {
      throw new Error(`Unknown lawncare plan id: ${item.planId}`);
    }

    const planId = item.planId as keyof typeof LAWNCARE_PLAN_PRICES;
    const pricingTier = getLawncarePricingTier(planId);

    return {
      basePriceCents: lawncarePrice,
      label: LAWNCARE_PLAN_LABELS[planId],
      pricingTier,
      serviceType: "lawncare",
    };
  }

  const laundryPrice =
    LAUNDRY_PLAN_PRICES[item.planId as keyof typeof LAUNDRY_PLAN_PRICES];

  if (!laundryPrice) {
    throw new Error(`Unknown laundry plan id: ${item.planId}`);
  }

  return {
    basePriceCents: laundryPrice,
    label: LAUNDRY_PLAN_LABELS[item.planId as keyof typeof LAUNDRY_PLAN_LABELS],
    serviceType: "laundry",
  };
};

const normalizeTiming = (
  inputTimingType: TimingType | undefined,
  scheduledStartAt: string | undefined
): TimingType => {
  if (inputTimingType) {
    return inputTimingType;
  }

  if (scheduledStartAt) {
    return "scheduled";
  }

  return "asap";
};

export interface ComputedCheckout {
  lineItems: CheckoutPreviewLineItem[];
  subtotalCents: number;
  totalCents: number;
}

export const computeCheckoutPreview = (
  input: CheckoutPreviewRequest
): ComputedCheckout => {
  const lineItems: CheckoutPreviewLineItem[] = [];

  for (const item of input.items) {
    const parsed = parsePlanPrice(item);
    const tipAmountCents = Math.max(0, item.tipAmountCents ?? 0);
    const quantity = 1;
    const totalPriceCents = parsed.basePriceCents * quantity + tipAmountCents;

    lineItems.push({
      basePriceCents: parsed.basePriceCents,
      itemKind: item.itemKind,
      label: parsed.label,
      metadata: {
        homeQuoteId: item.homeQuoteId ?? null,
        planId: item.planId ?? null,
        pricingTier: parsed.pricingTier ?? null,
        scheduledEndAt: item.scheduledEndAt ?? null,
        scheduledStartAt: item.scheduledStartAt ?? null,
        serviceType: parsed.serviceType ?? null,
        timingType: normalizeTiming(item.timingType, item.scheduledStartAt),
      },
      planId: item.planId,
      quantity,
      tipAmountCents,
      totalPriceCents,
    });
  }

  const subtotalCents = lineItems.reduce(
    (sum, item) => sum + item.basePriceCents * item.quantity,
    0
  );
  const totalCents = lineItems.reduce(
    (sum, item) => sum + item.totalPriceCents,
    0
  );

  return {
    lineItems,
    subtotalCents,
    totalCents,
  };
};
