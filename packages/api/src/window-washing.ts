/* eslint-disable no-inline-comments, func-style, max-statements */
export type WindowWashingPackageType = "EXTERIOR_ONLY" | "FULL_SERVICE";
export type WindowWashingPropertyType = "residential" | "commercial";

export interface WindowWashingInput {
  /** Square footage of the living area */
  livingArea?: number;
  /** Number of stories in the property */
  stories?: number;
  /** Service package option: Exterior Only vs Full Service (Inside & Out) */
  packageType: WindowWashingPackageType;
  /** Whether screen cleaning is requested ($2.50/screen) */
  cleanScreens: boolean;
  /** Property classification: residential vs commercial/storefront */
  propertyType?: WindowWashingPropertyType;
  /** Explicit glass pane count override */
  paneCount?: number;
}

export interface WindowWashingQuoteResult {
  /** Property classification */
  propertyType: WindowWashingPropertyType;
  /** Package scope selected */
  packageType: WindowWashingPackageType;
  /** Clean screens selected */
  cleanScreens: boolean;
  /** Number of stories */
  stories: number;
  /** Estimated or specified total glass panes */
  estimatedPanes: number;
  /** Rate per glass pane ($5/$10 for res, $10/$20 for commercial) */
  ratePerPane: number;
  /** Base glass cost in dollars */
  baseGlassCost: number;
  /** Ladder fee in dollars ($50 if stories >= 2, else $0) */
  ladderFee: number;
  /** Screen cleaning fee in dollars ($2.50 per screen) */
  screenFee: number;
  /** Raw subtotal before job minimum floor */
  rawSubtotal: number;
  /** Whether minimum job floor ($100.00) was applied */
  isMinimumFloorApplied: boolean;
  /** Final calculated quote in dollars (MAX(100.00, rawSubtotal)) */
  finalPrice: number;
  /** Deposit amount in dollars (flat $50.00) */
  depositAmount: number;
  /** Prices converted to integer cents for API & Stripe compatibility */
  cents: {
    baseGlassCostCents: number;
    ladderFeeCents: number;
    screenFeeCents: number;
    rawSubtotalCents: number;
    finalPriceCents: number;
    depositAmountCents: number;
  };
}

/**
 * Calculates deterministic window washing quotes based on uniform pane model,
 * standardized service scopes, height multipliers, screen add-ons, and a $100 job minimum floor.
 */
export function calculateWindowWashingQuote(
  input: WindowWashingInput
): WindowWashingQuoteResult {
  const propertyType = input.propertyType ?? "residential";
  const packageType = input.packageType ?? "EXTERIOR_ONLY";
  const cleanScreens = Boolean(input.cleanScreens);
  const stories = Math.max(1, input.stories || 1);

  // 1. Determine Pane Count:
  // If paneCount is passed, use it. Otherwise estimate 1 pane per 100 sqft with min 10 panes.
  let estimatedPanes = input.paneCount;
  if (!estimatedPanes || estimatedPanes <= 0) {
    const livingArea = Math.max(0, input.livingArea || 1400);
    estimatedPanes = Math.max(10, Math.round(livingArea / 100));
  }

  // 2. Base Glass Cost Calculation:
  // Residential: Outside Only = $5.00/pane, Inside & Out = $10.00/pane
  // Commercial: Outside Only = $10.00/pane, Inside & Out = $20.00/pane
  let ratePerPane = 5;
  if (propertyType === "commercial") {
    ratePerPane = packageType === "FULL_SERVICE" ? 20 : 10;
  } else {
    ratePerPane = packageType === "FULL_SERVICE" ? 10 : 5;
  }
  const baseGlassCost = estimatedPanes * ratePerPane;

  // 3. Screen Fee Calculation ($2.50 per screen)
  const screenRate = 2.5;
  const screenFee = cleanScreens ? estimatedPanes * screenRate : 0;

  // 4. Height / Ladder Fee ($50 for stories >= 2)
  const ladderFee = stories >= 2 ? 50 : 0;

  // 5. Raw Subtotal & $100.00 Minimum Job Floor
  const rawSubtotal = baseGlassCost + screenFee + ladderFee;
  const isMinimumFloorApplied = rawSubtotal < 100;
  const finalPrice = Math.max(100, rawSubtotal);
  const depositAmount = 50;

  return {
    baseGlassCost,
    cents: {
      baseGlassCostCents: Math.round(baseGlassCost * 100),
      depositAmountCents: 5000,
      finalPriceCents: Math.round(finalPrice * 100),
      ladderFeeCents: Math.round(ladderFee * 100),
      rawSubtotalCents: Math.round(rawSubtotal * 100),
      screenFeeCents: Math.round(screenFee * 100),
    },
    cleanScreens,
    depositAmount,
    estimatedPanes,
    finalPrice,
    isMinimumFloorApplied,
    ladderFee,
    packageType,
    propertyType,
    ratePerPane,
    rawSubtotal,
    screenFee,
    stories,
  };
}

/**
 * Mock execution test runner for verifying calculations.
 */
export function runMockWindowWashingTests() {
  const testCases: {
    name: string;
    input: WindowWashingInput;
    expected: Partial<WindowWashingQuoteResult>;
  }[] = [
    {
      expected: {
        baseGlassCost: 70, // 14 panes * $5
        depositAmount: 50,
        estimatedPanes: 14, // 1400/100
        finalPrice: 100, // floor override ($70 -> $100)
        isMinimumFloorApplied: true,
        ladderFee: 0,
        screenFee: 0,
      },
      input: {
        cleanScreens: false,
        livingArea: 1400,
        packageType: "EXTERIOR_ONLY",
        propertyType: "residential",
        stories: 1,
      },
      name: "1,400 sqft 1-story res, EXTERIOR_ONLY, no screens (Floor $100 enforced)",
    },
    {
      expected: {
        baseGlassCost: 280, // 28 panes * $10
        depositAmount: 50,
        estimatedPanes: 28, // 2800/100
        finalPrice: 400, // 280 + 70 (28*$2.50) + 50
        isMinimumFloorApplied: false,
        ladderFee: 50, // stories >= 2
        screenFee: 70,
      },
      input: {
        cleanScreens: true,
        livingArea: 2800,
        packageType: "FULL_SERVICE",
        propertyType: "residential",
        stories: 2,
      },
      name: "2,800 sqft 2-story res, FULL_SERVICE, with screens ($2.50/screen + $50 ladder fee)",
    },
    {
      expected: {
        baseGlassCost: 300, // 30 panes * $10
        depositAmount: 50,
        estimatedPanes: 30,
        finalPrice: 300,
        isMinimumFloorApplied: false,
        ladderFee: 0,
        screenFee: 0,
      },
      input: {
        cleanScreens: false,
        packageType: "EXTERIOR_ONLY",
        paneCount: 30,
        propertyType: "commercial",
        stories: 1,
      },
      name: "Commercial 30 panes, EXTERIOR_ONLY ($10/pane)",
    },
  ];

  return testCases.map((tc) => {
    const result = calculateWindowWashingQuote(tc.input);
    const passed =
      result.estimatedPanes === tc.expected.estimatedPanes &&
      result.baseGlassCost === tc.expected.baseGlassCost &&
      result.ladderFee === tc.expected.ladderFee &&
      result.screenFee === tc.expected.screenFee &&
      result.finalPrice === tc.expected.finalPrice &&
      result.depositAmount === tc.expected.depositAmount;

    return {
      expected: tc.expected,
      name: tc.name,
      passed,
      result,
    };
  });
}
