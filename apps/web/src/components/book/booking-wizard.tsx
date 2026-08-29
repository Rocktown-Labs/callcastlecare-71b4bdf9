import {
  CheckoutItemKind,
  COMBO_SUBSCRIPTION_PRICES,
  calculateWindowWashingQuote,
  getLawncareLotTier,
  getLawncarePlanId,
  getScheduledWindowForSlot,
  LAUNDRY_PLAN_PRICES,
  LAWNCARE_PLAN_PRICES,
  TECHNOLOGY_FEE_CENTS,
  WINDOW_WASHING_SUBSCRIPTION_PRICES,
} from "@callcastlecare/api";
import type { CheckoutPreviewItemInput } from "@callcastlecare/api";
import {
  formatUsPhoneInput,
  normalizeIntegerInput,
  phoneSchema,
  positiveWholeNumberStringSchema,
} from "@callcastlecare/api/validation";
import { Button } from "@callcastlecare/ui/components/button";
import { Input } from "@callcastlecare/ui/components/input";
import { Label } from "@callcastlecare/ui/components/label";
import { cn } from "@callcastlecare/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  CreditCard,
  Crown,
  FileImage,
  Info,
  Mail,
  PackageCheck,
  Phone,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import {
  bookingTimeSlots,
  fetchBookingAvailability,
  getDefaultBookingAvailability,
} from "@/lib/scheduling";
import type { BookingTimeSlot } from "@/lib/scheduling";
import { getServerUrl } from "@/lib/server-url";
import {
  comboSubscriptions,
  serviceCatalog,
  serviceIdSchema,
  serviceQuestionIcons,
  sortServiceIds,
} from "@/lib/service-catalog";
import type { ServiceId } from "@/lib/service-catalog";

import { RadarAddressInput } from "../home/radar-address-input";
import {
  getCachedValidatedAddress,
  validateAddress,
} from "../home/use-radar-address-autocomplete";
import type {
  PropertyEstimate,
  RadarAddressSuggestion,
} from "../home/use-radar-address-autocomplete";

const storageKey = "callcastlecare.booking-draft.v1";
const trackingKey = "callcastlecare.quote-request-id.v1";
const todayDateValue = () => new Date().toISOString().slice(0, 10);

const grassHeights = [
  {
    description: "Maintained and ready for a clean cut.",
    id: "low",
    name: "Low",
  },
  {
    description: "A normal mow with a little shaping needed.",
    id: "medium",
    name: "Medium",
  },
  {
    description: "Overgrown enough to need extra time.",
    id: "tall",
    name: "Tall",
  },
] as const;

const manualLotSizeOptions = [
  {
    description: "Under 0.55 acres.",
    id: "small",
    lotSizeAcres: 0.35,
    name: "Small lot",
  },
  {
    description: "0.55 to 1 acre.",
    id: "medium",
    lotSizeAcres: 0.75,
    name: "Medium lot",
  },
  {
    description: "1 to 2 acres.",
    id: "large",
    lotSizeAcres: 1.5,
    name: "Large lot",
  },
  {
    description: "Over 2 acres or unusual access.",
    id: "custom",
    lotSizeAcres: null,
    name: "Custom quote",
  },
] as const;

type ManualLotSizeId = (typeof manualLotSizeOptions)[number]["id"];

const productsByService = {
  laundry: [
    {
      description: "Wash and fold pickup for standard weekly laundry.",
      id: "royal-wash-basic",
      name: "Royal Wash",
      priceCents: LAUNDRY_PLAN_PRICES["royal-wash-basic"],
      recurring: false,
    },
    {
      description:
        "Same-day wash and fold with bedding and heavier linens included.",
      id: "royal-wash-bedding",
      name: "Royal Wash + Bedding",
      priceCents: LAUNDRY_PLAN_PRICES["royal-wash-deluxe"],
      recurring: false,
    },
    {
      description:
        "Weekly pickup, wash, fold, and delivery with bedding included.",
      id: "royal-wash-supreme",
      name: "Royal Wash Supreme",
      priceCents: LAUNDRY_PLAN_PRICES["royal-wash-supreme"],
      recurring: true,
    },
  ],
  lawncare: [
    {
      description: "One-time mow, edge, trim, and cleanup under 0.55 acres.",
      id: "groundskeeper-one-time",
      name: "Groundskeeper Small Lot",
      priceCents: LAWNCARE_PLAN_PRICES["groundskeeper-one-time"],
      recurring: false,
    },
    {
      description: "One-time mow, edge, trim, and cleanup from 0.55 to 1 acre.",
      id: "groundskeeper-one-time-medium",
      name: "Groundskeeper Medium Lot",
      priceCents: LAWNCARE_PLAN_PRICES["groundskeeper-one-time-medium"],
      recurring: false,
    },
    {
      description: "One-time lawn care for 1 to 2 acre properties.",
      id: "groundskeeper-one-time-large",
      name: "Groundskeeper Large Lot",
      priceCents: LAWNCARE_PLAN_PRICES["groundskeeper-one-time-large"],
      recurring: false,
    },
    {
      description: "Bi-weekly care for steady curb appeal.",
      id: "groundskeeper-bi-weekly",
      name: "Groundskeeper Bi-Weekly Small",
      priceCents: LAWNCARE_PLAN_PRICES["groundskeeper-bi-weekly"],
      recurring: true,
    },
    {
      description: "Bi-weekly care for medium lots.",
      id: "groundskeeper-bi-weekly-medium",
      name: "Groundskeeper Bi-Weekly Medium",
      priceCents: LAWNCARE_PLAN_PRICES["groundskeeper-bi-weekly-medium"],
      recurring: true,
    },
    {
      description: "Bi-weekly care for large lots.",
      id: "groundskeeper-bi-weekly-large",
      name: "Groundskeeper Bi-Weekly Large",
      priceCents: LAWNCARE_PLAN_PRICES["groundskeeper-bi-weekly-large"],
      recurring: true,
    },
    {
      description: "Monthly mowing and cleanup for small lots.",
      id: "groundskeeper-monthly",
      name: "Groundskeeper Monthly Small",
      priceCents: LAWNCARE_PLAN_PRICES["groundskeeper-monthly"],
      recurring: true,
    },
    {
      description: "Monthly mowing and cleanup for medium lots.",
      id: "groundskeeper-monthly-medium",
      name: "Groundskeeper Monthly Medium",
      priceCents: LAWNCARE_PLAN_PRICES["groundskeeper-monthly-medium"],
      recurring: true,
    },
    {
      description: "Monthly mowing and cleanup for large lots.",
      id: "groundskeeper-monthly-large",
      name: "Groundskeeper Monthly Large",
      priceCents: LAWNCARE_PLAN_PRICES["groundskeeper-monthly-large"],
      recurring: true,
    },
    {
      description:
        "Your $50 deposit covers an on-site visit to inspect the property and provide your custom quote.",
      id: "groundskeeper-custom-quote-deposit",
      name: "Groundskeeper Custom Quote Deposit",
      priceCents: LAWNCARE_PLAN_PRICES["groundskeeper-custom-quote-deposit"],
      recurring: false,
    },
  ],
  "window-washing": [
    {
      description: "Exterior glass from $5 per pane.",
      id: "royal-pane-exterior",
      name: "Royal Pane Shine",
      priceCents: 10_000,
      recurring: false,
    },
    {
      description: "Inside and outside glass care using the launch estimate.",
      id: "royal-pane-detail",
      name: "Royal Pane Detail",
      priceCents: 20_000,
      recurring: false,
    },
    {
      description: "Monthly exterior glass care.",
      id: "royal-pane-monthly",
      name: "Royal Pane Monthly",
      priceCents: WINDOW_WASHING_SUBSCRIPTION_PRICES["royal-pane-monthly"],
      recurring: true,
    },
    {
      description: "Two inside-and-out window washing visits per year.",
      id: "royal-pane-bi-annual",
      name: "Royal Pane Bi-Annual Detail",
      priceCents: WINDOW_WASHING_SUBSCRIPTION_PRICES["royal-pane-bi-annual"],
      recurring: true,
    },
  ],
} as const satisfies Record<ServiceId, ProductOption[]>;

const paymentOptions = [
  {
    description:
      "Pay the $50 deposit today. We invoice the remaining balance around service completion.",
    id: "deposit_invoice",
    name: "Deposit now, invoice later",
  },
  {
    description:
      "Pay the deposit and remaining estimate together before the appointment.",
    id: "pay_full",
    name: "Pay in full today",
  },
  {
    description:
      "Pay the $50 deposit online and settle the rest in cash after service.",
    id: "deposit_cash",
    name: "Deposit now, cash later",
  },
] as const;

const subscriptionPaymentOption = {
  description:
    "Start the recurring plan now. Your first monthly plan charge is due today.",
  id: "pay_full",
  name: "Start subscription today",
} as const;

const tallGrassFeeCents = 5000;
const screenWashFeePerScreenCents = 250;
const beddingUpgradeCents =
  LAUNDRY_PLAN_PRICES["royal-wash-deluxe"] -
  LAUNDRY_PLAN_PRICES["royal-wash-basic"];
const stepKeys = [
  "schedule",
  "contact",
  "details",
  "products",
  "plans",
  "invoice",
] as const;

const basicsSchema = z.object({
  address: z.string().min(5, "Enter a service address."),
  addressId: z.number().int().positive().nullable(),
  date: z
    .string()
    .min(1, "Choose a date.")
    .refine((value) => !value || value >= todayDateValue(), {
      message: "Choose today or a future date.",
    }),
  services: z.array(serviceIdSchema).min(1, "Select at least one service."),
  timeSlot: z.enum(bookingTimeSlots, {
    message: "Choose one of the available time windows.",
  }),
});

const contactSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  name: z.string().min(2, "Enter your name."),
  phone: phoneSchema,
  smsUpdates: z.boolean(),
});

const lawncareDetailsSchema = z.object({
  grassHeight: z.enum(["low", "medium", "tall"], {
    message: "Choose a grass height.",
  }),
  hasPets: z.enum(["yes", "no"], {
    message: "Tell us if pets are on the property.",
  }),
  lotSizeTier: z
    .enum(["small", "medium", "large", "custom"])
    .optional()
    .or(z.literal("")),
  obstacles: z.string().trim().max(500).optional().or(z.literal("")),
});

const laundryDetailsSchema = z.object({
  bedding: z.enum(["none", "with-bedding"], {
    message: "Choose a bedding option.",
  }),
  pickupMode: z.enum(["outside", "knock"], {
    message: "Choose outside (contactless) or knock to collect.",
  }),
});

const windowDetailsSchema = z
  .object({
    cleaningScope: z.enum(["both", "exterior"], {
      message: "Choose exterior only or inside and out.",
    }),
    finalizeOnSite: z.boolean(),
    screenCount: z.string(),
    stories: z.enum(["1", "2", "3"], {
      message: "Choose the number of stories.",
    }),
    washScreens: z.boolean(),
    windowEstimate: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!value.finalizeOnSite) {
      const parsedWindowEstimate = positiveWholeNumberStringSchema.safeParse(
        value.windowEstimate
      );
      if (!parsedWindowEstimate.success) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a positive window estimate or choose on-site quote.",
          path: ["windowEstimate"],
        });
      }
    }

    if (value.washScreens && !value.finalizeOnSite) {
      const parsedScreenCount = positiveWholeNumberStringSchema.safeParse(
        value.screenCount
      );
      if (!parsedScreenCount.success) {
        ctx.addIssue({
          code: "custom",
          message: "Enter the number of screens.",
          path: ["screenCount"],
        });
      }
    }
  });

interface ProductOption {
  description: string;
  id: string;
  name: string;
  priceCents: number;
  recurring: boolean;
}

type PaymentOptionId = (typeof paymentOptions)[number]["id"];
type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;
type WizardStepKey = (typeof stepKeys)[number];

interface BookingDraft {
  address: string;
  addressId: number | null;
  addressLatitude: number | null;
  addressLongitude: number | null;
  addressStateCode: string | null;
  contact: {
    email: string;
    name: string;
    phone: string;
    smsUpdates: boolean;
  };
  date: string;
  marketMode: "on_demand" | "paused" | "subscription_first" | null;
  paymentOption: PaymentOptionId | "";
  products: Partial<Record<ServiceId, string>>;
  property: PropertyEstimate | null;
  serviceDetails: {
    laundry: {
      bedding: "none" | "with-bedding" | "";
      photoNames: string[];
      pickupMode: "outside" | "knock" | "";
    };
    lawncare: {
      grassHeight: "low" | "medium" | "tall" | "";
      hasPets: "yes" | "no" | "";
      lotSizeTier: ManualLotSizeId | "";
      obstacles: string;
      photoNames: string[];
    };
    "window-washing": {
      cleaningScope: "exterior" | "both" | "";
      finalizeOnSite: boolean;
      photoNames: string[];
      screenCount: string;
      stories: "1" | "2" | "3" | "";
      washScreens: boolean;
      windowEstimate: string;
    };
  };
  services: ServiceId[];
  subscriptionId: string;
  timeSlot: string;
  tipCustomPercent: string;
  tipPercent: 0 | 5 | 10 | 15 | 20 | "custom" | "";
  travel: {
    distanceMiles: number;
    driveMinutes: number;
    feeCents: number;
    feeKind: "free" | "in_state" | "out_of_state";
    inState: boolean;
    isLocal: boolean;
    prefersSubscription: boolean;
  } | null;
}

export interface BookingWizardAddress {
  city: string;
  formattedAddress?: string | null;
  id: number;
  instructions?: string | null;
  isDefault: boolean;
  isValidated: boolean;
  label: string;
  latitude?: number | null;
  longitude?: number | null;
  state: string;
  street: string;
  zip: string;
}

interface BookingWizardProps {
  initialAddress?: string;
  initialAddressId?: number | null;
  initialContact?: Partial<BookingDraft["contact"]>;
  initialDate?: string;
  initialQuoteRequestId?: string;
  initialResumeDraft?: boolean;
  initialServices: ServiceId[];
  initialStep?: WizardStepKey;
  initialTimeSlot?: string;
  savedAddresses?: BookingWizardAddress[];
}

const emptyDraft = ({
  initialAddress = "",
  initialAddressId = null,
  initialContact,
  initialDate = "",
  initialServices,
  initialTimeSlot = "",
}: BookingWizardProps): BookingDraft => ({
  address: initialAddress,
  addressId: initialAddressId,
  addressLatitude: null,
  addressLongitude: null,
  addressStateCode: null,
  contact: {
    email: initialContact?.email ?? "",
    name: initialContact?.name ?? "",
    phone: initialContact?.phone ?? "",
    smsUpdates: initialContact?.smsUpdates ?? false,
  },
  date: initialDate,
  marketMode: null,
  paymentOption: "",
  products: {},
  property: null,
  serviceDetails: {
    laundry: { bedding: "", photoNames: [], pickupMode: "" },
    lawncare: {
      grassHeight: "",
      hasPets: "",
      lotSizeTier: "",
      obstacles: "",
      photoNames: [],
    },
    "window-washing": {
      cleaningScope: "",
      finalizeOnSite: false,
      photoNames: [],
      screenCount: "",
      stories: "",
      washScreens: false,
      windowEstimate: "",
    },
  },
  services: sortServiceIds(initialServices),
  subscriptionId: "",
  timeSlot: initialTimeSlot,
  tipCustomPercent: "",
  tipPercent: "",
  travel: null,
});

const formatCents = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);

const formatLongDate = (value: string) => {
  if (!value) {
    return "Choose A Date";
  }

  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "Choose A Date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(parsed);
};

const formatInvoiceDate = (value: string) => {
  if (!value) {
    return "the selected date";
  }

  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "the selected date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  }).format(parsed);
};

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const getCalendarDays = (monthDate: Date) => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0
  ).getDate();
  const leadingBlankCount = firstDay.getDay();

  return [
    ...Array.from({ length: leadingBlankCount }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
};

const parseStoredDraft = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as BookingDraft;
  } catch {
    return null;
  }
};

const getOrCreateTrackingId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const stored = window.localStorage.getItem(trackingKey);
  if (stored) {
    return stored;
  }

  const generated =
    globalThis.crypto?.randomUUID?.() ??
    `quote-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(trackingKey, generated);
  return generated;
};

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const normalizeServiceDetails = (
  initialDraft: BookingDraft,
  storedDraft: BookingDraft | null
) => {
  const storedLaundry = storedDraft?.serviceDetails?.laundry;
  const storedLawncare = storedDraft?.serviceDetails?.lawncare;
  const storedWindows = storedDraft?.serviceDetails?.["window-washing"];

  return {
    ...initialDraft.serviceDetails,
    ...storedDraft?.serviceDetails,
    laundry: {
      ...initialDraft.serviceDetails.laundry,
      ...storedLaundry,
      photoNames: toStringArray(storedLaundry?.photoNames),
    },
    lawncare: {
      ...initialDraft.serviceDetails.lawncare,
      ...storedLawncare,
      photoNames: toStringArray(storedLawncare?.photoNames),
    },
    "window-washing": {
      ...initialDraft.serviceDetails["window-washing"],
      ...storedWindows,
      photoNames: toStringArray(storedWindows?.photoNames),
    },
  };
};

const resolveInitialServices = (
  props: BookingWizardProps,
  storedDraft: BookingDraft | null
) => {
  if (props.initialServices.length > 0) {
    return sortServiceIds(props.initialServices);
  }

  if (props.initialResumeDraft) {
    return sortServiceIds(storedDraft?.services ?? []);
  }

  return [];
};

const parsePositiveCount = (value: string) => {
  const count = Math.trunc(Number(value));
  if (!Number.isFinite(count) || count < 1) {
    return 0;
  }

  return count;
};

const SQFT_PER_ACRE = 43_560;

const getLotSizeAcres = (property: PropertyEstimate | null) => {
  if (
    !property ||
    property.fallbackUsed ||
    !property.lotSizeSqft ||
    property.lotSizeSqft <= 0
  ) {
    return null;
  }

  return property.lotSizeSqft / SQFT_PER_ACRE;
};

const getDraftLotSizeAcres = (draft: BookingDraft) => {
  const directLot = getLotSizeAcres(draft.property);
  if (directLot) {
    return directLot;
  }
  if (draft.address) {
    const cached = getCachedValidatedAddress(draft.address);
    if (cached?.property) {
      return getLotSizeAcres(cached.property);
    }
  }
  return null;
};

const getLawncareFitPlanIds = (draft: BookingDraft) => {
  const lotSizeAcres = getDraftLotSizeAcres(draft);
  if (!lotSizeAcres) {
    return new Set(["groundskeeper-custom-quote-deposit"]);
  }

  const oneTimePlanId = getLawncarePlanId({
    frequency: "one_time",
    lotSizeAcres,
  });
  if (oneTimePlanId === "groundskeeper-custom-quote-deposit") {
    return new Set([oneTimePlanId]);
  }

  return new Set([
    oneTimePlanId,
    getLawncarePlanId({ frequency: "monthly", lotSizeAcres }),
    getLawncarePlanId({ frequency: "bi_weekly", lotSizeAcres }),
  ]);
};

const getEligibleProductsForDraft = (
  draft: BookingDraft,
  serviceId: ServiceId
) => {
  const products = productsByService[serviceId].filter(
    (product) => !product.recurring
  );

  if (serviceId === "lawncare") {
    const eligiblePlanIds = getLawncareFitPlanIds(draft);
    return products.filter((product) => eligiblePlanIds.has(product.id));
  }

  if (serviceId === "laundry") {
    const {
      laundry: { bedding },
    } = draft.serviceDetails;
    if (bedding === "with-bedding") {
      return products.filter((product) =>
        ["royal-wash-bedding", "royal-wash-supreme"].includes(product.id)
      );
    }

    if (bedding === "none") {
      return products.filter((product) =>
        ["royal-wash-basic", "royal-wash-supreme"].includes(product.id)
      );
    }
  }

  if (serviceId === "window-washing") {
    const scope = draft.serviceDetails["window-washing"].cleaningScope;
    if (scope === "both") {
      return products.filter((product) =>
        ["royal-pane-detail", "royal-pane-bi-annual"].includes(product.id)
      );
    }

    if (scope === "exterior") {
      return products.filter((product) =>
        ["royal-pane-exterior", "royal-pane-monthly"].includes(product.id)
      );
    }
  }

  return products;
};

const pruneInvalidProductSelections = (draft: BookingDraft): BookingDraft => {
  const products = Object.fromEntries(
    Object.entries(draft.products).filter(([serviceId, selectedProductId]) => {
      const normalizedServiceId = serviceId as ServiceId;
      return (
        draft.services.includes(normalizedServiceId) &&
        getEligibleProductsForDraft(draft, normalizedServiceId).some(
          (product) => product.id === selectedProductId
        )
      );
    })
  ) as BookingDraft["products"];

  return {
    ...draft,
    products,
  };
};

const getWindowBasePriceCents = (
  draft: BookingDraft,
  product: ProductOption
) => {
  const windowDetails = draft.serviceDetails["window-washing"];
  const paneCount = parsePositiveCount(windowDetails.windowEstimate);
  const packageType =
    product.id === "royal-pane-detail" ? "FULL_SERVICE" : "EXTERIOR_ONLY";
  const quote = calculateWindowWashingQuote({
    cleanScreens: false,
    packageType,
    paneCount: windowDetails.finalizeOnSite ? undefined : paneCount,
    propertyType: "residential",
    stories: Number(windowDetails.stories) || 1,
  });

  return quote.cents.finalPriceCents;
};

const getProductPriceCents = (
  draft: BookingDraft,
  serviceId: ServiceId,
  product: ProductOption
) => {
  if (serviceId === "window-washing" && !product.recurring) {
    return getWindowBasePriceCents(draft, product);
  }

  return product.priceCents;
};

const getSelectedProduct = (draft: BookingDraft, serviceId: ServiceId) => {
  const selectedProductId = draft.products[serviceId];
  return productsByService[serviceId].find(
    ({ id }) => id === selectedProductId
  );
};

const hasSelectedRecurringProduct = (draft: BookingDraft) =>
  draft.services.some(
    (serviceId) => getSelectedProduct(draft, serviceId)?.recurring
  );

const selectedProductTotal = (draft: BookingDraft) => {
  let total = 0;

  for (const serviceId of draft.services) {
    const product = getSelectedProduct(draft, serviceId);
    total += product ? getProductPriceCents(draft, serviceId, product) : 0;
  }

  return total;
};

const getQuoteAddOns = (draft: BookingDraft) => {
  const addOns: {
    description: string;
    name: string;
    priceCents: number;
  }[] = [];

  if (
    draft.services.includes("lawncare") &&
    draft.serviceDetails.lawncare.grassHeight === "tall"
  ) {
    addOns.push({
      description: "Extra time for overgrown grass and cleanup.",
      name: "Tall grass fee",
      priceCents: tallGrassFeeCents,
    });
  }

  if (!draft.services.includes("window-washing")) {
    return addOns;
  }

  const windowDetails = draft.serviceDetails["window-washing"];
  if (windowDetails.finalizeOnSite) {
    return addOns;
  }

  const screenCount = parsePositiveCount(windowDetails.screenCount);

  if (windowDetails.washScreens && screenCount > 0) {
    addOns.push({
      description: `${screenCount} screens x ${formatCents(
        screenWashFeePerScreenCents
      )}`,
      name: "Screen washing",
      priceCents: screenCount * screenWashFeePerScreenCents,
    });
  }

  return addOns;
};

const getDraftTipAmountCents = (draft: BookingDraft, subtotalCents: number) => {
  if (draft.tipPercent === "") {
    return null;
  }

  if (draft.tipPercent === "custom") {
    const customDollars = Number(draft.tipCustomPercent);
    if (!Number.isFinite(customDollars) || customDollars < 0) {
      return null;
    }
    return Math.round(customDollars * 100);
  }

  return Math.round((subtotalCents * draft.tipPercent) / 100);
};

type TipPercentOption = 0 | 5 | 10 | 15 | 20 | "custom";

const getTipOptionLabel = (option: TipPercentOption) => {
  if (option === 0) {
    return "None";
  }

  if (option === "custom") {
    return "Custom ($)";
  }

  return `${option}%`;
};

const getServiceLabel = (serviceId: ServiceId) =>
  serviceCatalog.find(({ id }) => id === serviceId)?.shortName ?? serviceId;

const stepKeyToIndex = (step?: WizardStepKey): WizardStep =>
  step ? (stepKeys.indexOf(step) as WizardStep) : 0;

const addServiceDetailErrors = (
  draft: BookingDraft,
  nextErrors: Record<string, string>
) => {
  if (draft.services.includes("lawncare")) {
    const lawn = lawncareDetailsSchema.safeParse(draft.serviceDetails.lawncare);
    if (!lawn.success) {
      const [issue] = lawn.error.issues;
      if (issue?.path[0] === "hasPets") {
        nextErrors.hasPets = "Tell us if pets are on the property.";
      } else {
        nextErrors.grassHeight = "Choose a grass height.";
      }
    }
  }
  if (draft.services.includes("laundry")) {
    const laundry = laundryDetailsSchema.safeParse(
      draft.serviceDetails.laundry
    );
    if (!laundry.success) {
      const [issue] = laundry.error.issues;
      if (issue?.path[0] === "pickupMode") {
        nextErrors.pickupMode = "Choose outside or knock for pickup.";
      } else {
        nextErrors.bedding = "Choose a bedding option.";
      }
    }
  }
  if (!draft.services.includes("window-washing")) {
    return;
  }

  const windowDetails = draft.serviceDetails["window-washing"];
  const result = windowDetailsSchema.safeParse(windowDetails);
  if (result.success) {
    return;
  }

  for (const issue of result.error.issues) {
    nextErrors[String(issue.path[0])] = issue.message;
  }
};

const buildInitialDraft = (
  props: BookingWizardProps,
  storedDraft: BookingDraft | null
) => {
  const initialDraft = emptyDraft(props);
  const activeStoredDraft = props.initialResumeDraft ? storedDraft : null;

  return {
    ...initialDraft,
    ...activeStoredDraft,
    address: props.initialAddress || activeStoredDraft?.address || "",
    addressId: props.initialAddressId ?? activeStoredDraft?.addressId ?? null,
    contact: {
      ...initialDraft.contact,
      ...activeStoredDraft?.contact,
      ...props.initialContact,
    },
    date: props.initialDate || activeStoredDraft?.date || "",
    serviceDetails: normalizeServiceDetails(initialDraft, activeStoredDraft),
    services: sortServiceIds(resolveInitialServices(props, activeStoredDraft)),
    timeSlot: props.initialTimeSlot || activeStoredDraft?.timeSlot || "",
  };
};

const resolveInitialStep = (
  props: BookingWizardProps,
  storedDraft: BookingDraft | null
): WizardStep => {
  const requestedStep = stepKeyToIndex(props.initialStep);
  if (requestedStep === 0) {
    return 0;
  }

  const initialDraft = buildInitialDraft(props, storedDraft);
  if (!basicsSchema.safeParse(initialDraft).success) {
    return 0;
  }

  if (requestedStep === 1) {
    return 1;
  }

  if (!contactSchema.safeParse(initialDraft.contact).success) {
    return 1;
  }

  const detailErrors: Record<string, string> = {};
  addServiceDetailErrors(initialDraft, detailErrors);
  if (requestedStep > 2 && Object.keys(detailErrors).length > 0) {
    return 2;
  }

  const hasSelectedProducts = initialDraft.services.every(
    (serviceId) => initialDraft.products[serviceId]
  );
  if (requestedStep > 3 && !hasSelectedProducts) {
    return 3;
  }

  return requestedStep;
};

const persistQuoteRequest = async ({
  draft,
  lastCompletedStep,
  status = "draft",
  trackingId,
}: {
  draft: BookingDraft;
  lastCompletedStep: number;
  status?: "draft" | "contact_captured" | "checkout_started";
  trackingId: string;
}) => {
  if (!trackingId) {
    return false;
  }

  const url = new URL("/api/v1/checkout/quote-request", getServerUrl());
  const response = await fetch(url, {
    body: JSON.stringify({
      address: draft.address,
      contact: draft.contact,
      lastCompletedStep,
      payload: draft as unknown as Record<string, unknown>,
      status,
      trackingId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json().catch(() => null)) as {
    saved?: boolean;
  } | null;

  return payload?.saved !== false;
};

const fetchQuoteRequestDraft = async (trackingId: string) => {
  const url = new URL(
    `/api/v1/checkout/quote-request/${encodeURIComponent(trackingId)}`,
    getServerUrl()
  );
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    quoteRequest?: {
      lastCompletedStep?: number;
      payload?: Record<string, unknown>;
    };
  };

  return payload.quoteRequest ?? null;
};

const getPaymentOptionsForServices = (
  services: ServiceId[],
  allowCashCheckout = true
) => {
  const options =
    services.length === 1 && services[0] === "laundry"
      ? paymentOptions.filter((option) => option.id === "pay_full")
      : paymentOptions;

  return allowCashCheckout
    ? options
    : options.filter((option) => option.id !== "deposit_cash");
};

const hasSubscriptionCheckout = (draft: BookingDraft) =>
  Boolean(draft.subscriptionId && draft.subscriptionId !== "one_time");

const getLawnSubscriptionTier = (draft: BookingDraft) => {
  const selectedLawnProduct = draft.products.lawncare ?? "";

  if (selectedLawnProduct.includes("large")) {
    return "large";
  }

  if (selectedLawnProduct.includes("medium")) {
    return "medium";
  }

  if (selectedLawnProduct.includes("small")) {
    return "small";
  }

  const lotSizeAcres = getDraftLotSizeAcres(draft);
  const tierFromAcreage = getLawncareLotTier(lotSizeAcres);
  if (tierFromAcreage !== "custom") {
    return tierFromAcreage;
  }

  return "small";
};

const getSubscriptionPriceCents = (draft: BookingDraft) => {
  const tier = getLawnSubscriptionTier(draft);

  if (draft.subscriptionId === "bi_weekly_royal_duo") {
    return COMBO_SUBSCRIPTION_PRICES[
      `bi-weekly-royal-duo-${tier}` as keyof typeof COMBO_SUBSCRIPTION_PRICES
    ];
  }

  if (draft.subscriptionId === "monthly_castle_care") {
    return COMBO_SUBSCRIPTION_PRICES[
      `monthly-castle-care-${tier}` as keyof typeof COMBO_SUBSCRIPTION_PRICES
    ];
  }

  if (draft.subscriptionId === "crown_estate_trio") {
    return COMBO_SUBSCRIPTION_PRICES[
      `crown-estate-trio-${tier}` as keyof typeof COMBO_SUBSCRIPTION_PRICES
    ];
  }

  if (draft.subscriptionId === "crown_estate_trio_deluxe") {
    return COMBO_SUBSCRIPTION_PRICES[
      `crown-estate-trio-deluxe-${tier}` as keyof typeof COMBO_SUBSCRIPTION_PRICES
    ];
  }

  if (draft.subscriptionId === "royal_linen_panes_duo") {
    return COMBO_SUBSCRIPTION_PRICES["royal-linen-panes-duo"];
  }

  return null;
};

const getComboPriceCents = (draft: BookingDraft, comboId: string) =>
  getSubscriptionPriceCents({ ...draft, subscriptionId: comboId });

const getComboPlanId = (draft: BookingDraft) => {
  const tier = getLawnSubscriptionTier(draft);

  if (draft.subscriptionId === "bi_weekly_royal_duo") {
    return `bi-weekly-royal-duo-${tier}`;
  }

  if (draft.subscriptionId === "monthly_castle_care") {
    return `monthly-castle-care-${tier}`;
  }

  if (draft.subscriptionId === "crown_estate_trio") {
    return `crown-estate-trio-${tier}`;
  }

  if (draft.subscriptionId === "crown_estate_trio_deluxe") {
    return `crown-estate-trio-deluxe-${tier}`;
  }

  if (draft.subscriptionId === "royal_linen_panes_duo") {
    return "royal-linen-panes-duo";
  }

  return null;
};

const getCheckoutItems = (draft: BookingDraft): CheckoutPreviewItemInput[] => {
  const scheduledWindow = getScheduledWindowForSlot(
    draft.date,
    draft.timeSlot as (typeof bookingTimeSlots)[number]
  );
  const comboPlanId = getComboPlanId(draft);
  if (comboPlanId) {
    return [
      {
        ...scheduledWindow,
        frequency: "monthly",
        isSubscription: true,
        itemKind: CheckoutItemKind.Lawncare,
        planId: comboPlanId,
        timingType: "scheduled" as const,
      },
    ];
  }

  return draft.services.flatMap((serviceId): CheckoutPreviewItemInput[] => {
    const selectedProductId = draft.products[serviceId];
    if (!selectedProductId) {
      return [];
    }

    const selectedProduct = productsByService[serviceId].find(
      (product) => product.id === selectedProductId
    );
    const baseItem = {
      ...scheduledWindow,
      timingType: "scheduled" as const,
    };

    if (serviceId === "window-washing") {
      const details = draft.serviceDetails["window-washing"];
      return [
        {
          ...baseItem,
          cleanScreens: details.washScreens,
          isSubscription: selectedProduct?.recurring,
          itemKind: CheckoutItemKind.WindowWashing,
          packageType:
            details.cleaningScope === "both"
              ? ("FULL_SERVICE" as const)
              : ("EXTERIOR_ONLY" as const),
          paneCount: details.finalizeOnSite
            ? undefined
            : parsePositiveCount(details.windowEstimate) || undefined,
          planId: selectedProductId,
          propertyType: "residential" as const,
          stories: Number(details.stories) || 1,
        },
      ];
    }

    return [
      {
        ...baseItem,
        isSubscription: selectedProduct?.recurring,
        itemKind:
          serviceId === "lawncare"
            ? CheckoutItemKind.Lawncare
            : CheckoutItemKind.Laundry,
        planId: selectedProductId,
      },
    ];
  });
};

const getPaymentOptionsForDraft = (
  draft: BookingDraft,
  allowCashCheckout = true
) => {
  if (hasSubscriptionCheckout(draft)) {
    return [subscriptionPaymentOption];
  }

  return getPaymentOptionsForServices(draft.services, allowCashCheckout);
};

const getEligibleCombos = (_draft: BookingDraft) =>
  comboSubscriptions.filter(() => false);

const isSubscriptionValidForDraft = (draft: BookingDraft) => {
  if (!draft.subscriptionId || draft.subscriptionId === "one_time") {
    return true;
  }

  return getEligibleCombos(draft).some(
    (combo) => combo.id === draft.subscriptionId
  );
};

const pruneProductsForServices = (draft: BookingDraft) =>
  Object.fromEntries(
    Object.entries(draft.products).filter(([id]) =>
      draft.services.includes(id as ServiceId)
    )
  ) as BookingDraft["products"];

const sanitizeDraftForCurrentCart = (draft: BookingDraft): BookingDraft => {
  const nextDraft = pruneInvalidProductSelections({
    ...draft,
    products: pruneProductsForServices(draft),
  });

  if (isSubscriptionValidForDraft(nextDraft)) {
    return nextDraft;
  }

  return {
    ...nextDraft,
    paymentOption: "",
    subscriptionId: "",
  };
};

const getLawnTierLabel = (draft: BookingDraft) => {
  const lotSizeAcres = getDraftLotSizeAcres(draft);
  const selectedProductTier = getLawnSubscriptionTier(draft);
  const tier = lotSizeAcres
    ? getLawncarePlanId({
        frequency: "one_time",
        lotSizeAcres,
      })
    : selectedProductTier;

  if (tier.includes("large")) {
    return "large lot";
  }

  if (tier.includes("medium")) {
    return "medium lot";
  }

  if (tier.includes("custom")) {
    return "custom quote";
  }

  return "small lot";
};

const getComboIncludedItems = (
  combo: (typeof comboSubscriptions)[number],
  draft: BookingDraft
) => {
  const lawnTierLabel = getLawnTierLabel(draft);

  if (combo.id === "bi_weekly_royal_duo") {
    return [
      {
        description: `${lawnTierLabel} Groundskeeper visit`,
        name: "2x Mow",
      },
      {
        description: "Bi-weekly wash and fold pickup",
        name: "2x Wash & Fold",
      },
    ];
  }

  if (combo.id === "monthly_castle_care") {
    return [
      {
        description: `${lawnTierLabel} Groundskeeper visit`,
        name: "1x Mow",
      },
      {
        description: "Exterior glass care",
        name: "1x Window Wash",
      },
    ];
  }

  if (combo.id === "royal_linen_panes_duo") {
    return [
      {
        description: "Bi-weekly wash and fold pickup",
        name: "2x Wash & Fold",
      },
      {
        description: "Exterior glass care",
        name: "1x Window Wash",
      },
    ];
  }

  if (combo.id === "crown_estate_trio_deluxe") {
    return [
      {
        description: `${lawnTierLabel} Groundskeeper visit`,
        name: "2x Mow",
      },
      {
        description: "Bi-weekly wash and fold pickup with bedding",
        name: "2x Wash & Fold",
      },
      {
        description: "Inside and out window washing visit",
        name: "1x Window Wash",
      },
    ];
  }

  return [
    {
      description: `${lawnTierLabel} Groundskeeper visit`,
      name: "2x Mow",
    },
    {
      description: "Bi-weekly wash and fold pickup",
      name: "2x Wash & Fold",
    },
    {
      description: "Exterior glass care",
      name: "1x Window Wash",
    },
  ];
};

const formatServiceList = (serviceIds: readonly ServiceId[]) =>
  new Intl.ListFormat("en-US", {
    style: "long",
    type: "conjunction",
  }).format(serviceIds.map(getServiceLabel));

const getProductSelectionName = (
  product: ProductOption,
  serviceId: ServiceId
) => {
  if (!product.recurring) {
    return product.name;
  }

  if (serviceId === "laundry") {
    return "Weekly";
  }

  if (product.id.includes("bi-weekly")) {
    return "Bi-weekly";
  }

  if (product.id.includes("bi-annual")) {
    return "Bi-annual";
  }

  if (product.id.includes("monthly")) {
    return "Monthly";
  }

  return product.name;
};

const getStepErrors = (
  draft: BookingDraft,
  step: WizardStep,
  allowCashCheckout = true
) => {
  const nextErrors: Record<string, string> = {};

  if (step === 0) {
    const result = basicsSchema.safeParse(draft);
    if (!result.success) {
      for (const issue of result.error.issues) {
        nextErrors[String(issue.path[0])] = issue.message;
      }
    }
  }

  if (step === 1) {
    const result = contactSchema.safeParse(draft.contact);
    if (!result.success) {
      for (const issue of result.error.issues) {
        nextErrors[`contact.${String(issue.path[0])}`] = issue.message;
      }
    }
  }

  if (step === 2) {
    addServiceDetailErrors(draft, nextErrors);
  }

  if (step === 3) {
    for (const serviceId of draft.services) {
      if (!draft.products[serviceId]) {
        nextErrors[`product.${serviceId}`] = "Select an item for this service.";
      }
    }
  }

  if (step === 5) {
    if (
      !getPaymentOptionsForDraft(draft, allowCashCheckout).some(
        (option) => option.id === draft.paymentOption
      )
    ) {
      nextErrors.paymentOption = "Choose a checkout option.";
    }

    if (draft.tipPercent === "") {
      nextErrors.tipPercent = "Choose a tip amount or None.";
    } else if (draft.tipPercent === "custom") {
      const custom = Number(draft.tipCustomPercent);
      if (!Number.isFinite(custom) || custom < 0) {
        nextErrors.tipPercent = "Enter a valid custom tip percent.";
      }
    }
  }

  return nextErrors;
};

const wizardSteps = [
  { icon: Calendar, label: "Schedule" },
  { icon: User, label: "Contact" },
  { icon: ClipboardList, label: "Details" },
  { icon: PackageCheck, label: "Products" },
  { icon: Crown, label: "Plans" },
  { icon: CreditCard, label: "Invoice" },
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
}[];

const StepPanel = ({
  children,
  isComplete,
  isOpen,
  number,
  title,
}: {
  children: React.ReactNode;
  isComplete: boolean;
  isOpen: boolean;
  number: string;
  title: string;
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-full border text-xs font-black",
            isComplete
              ? "border-lime-500 bg-lime-300 text-slate-950"
              : "border-slate-200 bg-white text-slate-500"
          )}
        >
          {isComplete ? <Check className="size-4" /> : number}
        </span>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
};

const StepProgress = ({
  activeStep,
  onStepSelect,
}: {
  activeStep: WizardStep;
  onStepSelect: (step: WizardStep) => void;
}) => (
  <nav
    aria-label="Booking progress"
    className="rounded-[1.5rem] border border-slate-200 bg-white p-2 text-slate-950 shadow-xl shadow-slate-200/60 sm:p-3"
  >
    <ol className="grid grid-cols-6 gap-1.5 sm:gap-2">
      {wizardSteps.map(({ icon: Icon, label }, index) => {
        const isComplete = index < activeStep;
        const isCurrent = activeStep === index;
        const isLocked = index > activeStep;

        return (
          <li key={label}>
            <button
              aria-label={label}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "group flex h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl border bg-slate-50 px-1 text-center text-[10px] font-black transition-colors sm:h-[4.5rem] sm:gap-1.5 sm:text-xs",
                isComplete &&
                  "border-lime-300 bg-lime-50 text-lime-800 hover:border-lime-400",
                isCurrent &&
                  "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-200",
                isLocked &&
                  "cursor-not-allowed border-slate-200 text-slate-400 opacity-70"
              )}
              disabled={isLocked}
              onClick={() => onStepSelect(index as WizardStep)}
              type="button"
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-xs font-black sm:size-8",
                  isComplete && "border-lime-400 bg-lime-300 text-slate-950",
                  isCurrent && "border-white/20 bg-white text-slate-950",
                  isLocked && "border-slate-200 bg-white text-slate-400"
                )}
              >
                {isComplete ? (
                  <Check className="size-3.5 sm:size-4" />
                ) : (
                  <Icon className="size-3.5 sm:size-4" />
                )}
              </span>
              <span aria-hidden="true" className="hidden leading-none sm:block">
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);

const StepButton = ({
  children = "Continue",
  onClick,
}: {
  children?: React.ReactNode;
  onClick: () => void;
}) => (
  <Button
    className="mt-4 h-11 rounded-full bg-lime-300 px-5 font-bold text-slate-950 hover:bg-lime-200"
    onClick={onClick}
    type="button"
  >
    {children}
    <ArrowRight className="size-4" />
  </Button>
);

const StepActions = ({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) => (
  <div className="mt-4 flex flex-wrap items-center gap-3">
    <Button
      className="h-11 rounded-full border-slate-200 bg-white px-5 font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
      onClick={onBack}
      type="button"
      variant="outline"
    >
      <ArrowLeft className="size-4" />
      Back
    </Button>
    {children}
  </div>
);

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <Label className="text-slate-600">
    {children}
    <span aria-hidden="true" className="text-lime-600">
      *
    </span>
  </Label>
);

const RoundedField = ({
  error,
  icon: Icon,
  label,
  required,
  ...props
}: React.ComponentProps<"input"> & {
  error?: string;
  icon?: LucideIcon;
  label: string;
  required?: boolean;
}) => (
  <div className="flex flex-col gap-2">
    {required ? (
      <RequiredLabel>{label}</RequiredLabel>
    ) : (
      <Label className="text-slate-600">{label}</Label>
    )}
    <div className="relative">
      {Icon ? (
        <Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      ) : null}
      <Input
        aria-invalid={Boolean(error)}
        className={cn(
          "h-11 rounded-2xl border-slate-200 bg-slate-50 text-sm text-slate-950 placeholder:text-slate-400 focus-visible:border-lime-500",
          Icon ? "pl-10" : "pl-3"
        )}
        {...props}
      />
    </div>
    {error ? <p className="text-sm text-rose-600">{error}</p> : null}
  </div>
);

const ScheduleDateTimePicker = ({
  date,
  dateError,
  driveMinutes = 0,
  latitude = null,
  longitude = null,
  onDateChange,
  onTimeSlotChange,
  stateCode = null,
  timeSlot,
}: {
  date: string;
  dateError?: string;
  driveMinutes?: number;
  latitude?: number | null;
  longitude?: number | null;
  onDateChange: (value: string) => void;
  onTimeSlotChange: (value: string) => void;
  stateCode?: string | null;
  timeSlot: string;
}) => {
  const selectedDate = date ? new Date(`${date}T12:00:00`) : new Date();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<
    BookingTimeSlot[]
  >(getDefaultBookingAvailability({ date, driveMinutes }).availableSlots);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const today = todayDateValue();
  const visibleMonthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  useEffect(() => {
    let isCurrent = true;

    const loadAvailability = async () => {
      try {
        const availability = await fetchBookingAvailability({
          date,
          driveMinutes,
          latitude,
          longitude,
          stateCode,
        });
        if (!isCurrent) {
          return;
        }

        setAvailableTimeSlots(availability.availableSlots);
        const earliestSlot =
          availability.nextAvailableSlot ?? availability.availableSlots[0];
        if (
          date &&
          earliestSlot &&
          !availability.availableSlots.some((slot) => slot === timeSlot)
        ) {
          onTimeSlotChange(earliestSlot);
        }
        if (date && !earliestSlot && timeSlot) {
          onTimeSlotChange("");
        }
      } catch {
        if (isCurrent) {
          const fallback = getDefaultBookingAvailability({
            date,
            driveMinutes,
          });
          setAvailableTimeSlots(fallback.availableSlots);
          if (
            fallback.nextAvailableSlot &&
            !fallback.availableSlots.some((slot) => slot === timeSlot)
          ) {
            onTimeSlotChange(fallback.nextAvailableSlot);
          }
        }
      }
    };

    void loadAvailability();

    return () => {
      isCurrent = false;
    };
  }, [
    date,
    driveMinutes,
    latitude,
    longitude,
    onTimeSlotChange,
    stateCode,
    timeSlot,
  ]);

  return (
    <div className="grid gap-4">
      <div className="relative flex flex-col gap-2">
        <RequiredLabel>Date</RequiredLabel>
        <Button
          aria-expanded={isCalendarOpen}
          className="h-11 w-full justify-between rounded-2xl border border-slate-300 bg-white px-3 font-normal text-slate-950 shadow-sm hover:border-lime-400 hover:bg-white hover:text-slate-950 focus-visible:border-lime-500"
          onClick={() => setIsCalendarOpen((current) => !current)}
          type="button"
          variant="outline"
        >
          <span className="inline-flex items-center gap-2">
            <Calendar className="size-4 text-slate-400" />
            {formatLongDate(date)}
          </span>
          <ChevronDown className="size-4 text-slate-400" />
        </Button>
        {isCalendarOpen ? (
          <div className="z-30 mt-2 w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:absolute sm:w-80">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold"
                onClick={() =>
                  setVisibleMonth(
                    new Date(
                      visibleMonth.getFullYear(),
                      visibleMonth.getMonth() - 1,
                      1
                    )
                  )
                }
                type="button"
              >
                Prev
              </button>
              <p className="font-black text-slate-950">{visibleMonthLabel}</p>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold"
                onClick={() =>
                  setVisibleMonth(
                    new Date(
                      visibleMonth.getFullYear(),
                      visibleMonth.getMonth() + 1,
                      1
                    )
                  )
                }
                type="button"
              >
                Next
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black uppercase tracking-widest text-slate-400">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day.slice(0, 1)}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {getCalendarDays(visibleMonth).map((day, index) => {
                if (!day) {
                  return <span aria-hidden key={`blank-${index}`} />;
                }

                const dayValue = toDateInputValue(
                  new Date(
                    visibleMonth.getFullYear(),
                    visibleMonth.getMonth(),
                    day
                  )
                );
                const isSelected = dayValue === date;
                const isPast = dayValue < today;

                return (
                  <button
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-2xl text-sm font-bold transition-colors",
                      isSelected
                        ? "bg-lime-300 text-slate-950"
                        : "text-slate-700 hover:bg-slate-100",
                      isPast ? "pointer-events-none opacity-30" : ""
                    )}
                    disabled={isPast}
                    key={dayValue}
                    onClick={() => {
                      onDateChange(dayValue);
                      setIsCalendarOpen(false);
                    }}
                    type="button"
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {dateError ? (
          <p className="text-sm text-rose-600">{dateError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <RequiredLabel>Time</RequiredLabel>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <select
            className="h-11 w-full appearance-none truncate rounded-2xl border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-950 shadow-sm outline-none transition-colors focus:border-lime-500"
            disabled={availableTimeSlots.length === 0}
            onChange={(event) => onTimeSlotChange(event.target.value)}
            value={
              availableTimeSlots.some((slot) => slot === timeSlot)
                ? timeSlot
                : ""
            }
          >
            {availableTimeSlots.length === 0 ? (
              <option value="">No slots open</option>
            ) : (
              <>
                <option disabled value="">
                  Choose A Time
                </option>
                {availableTimeSlots.map((slot) => (
                  <option key={slot}>{slot}</option>
                ))}
              </>
            )}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>
    </div>
  );
};

const QuestionAccordion = ({
  children,
  icon: Icon,
  isComplete,
  isOpen,
  onOpen,
  title,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  isComplete: boolean;
  isOpen: boolean;
  onOpen: () => void;
  title: string;
}) => (
  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
    <button
      className="flex w-full items-center justify-between gap-4 text-left"
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-2xl bg-white text-lime-600 shadow-sm",
            isComplete && "bg-lime-300 text-slate-950"
          )}
        >
          {isComplete ? (
            <Check className="size-5" />
          ) : (
            <Icon className="size-5" />
          )}
        </div>
        <h3 className="font-bold text-slate-950">{title}</h3>
      </div>
      <ChevronDown
        className={cn(
          "size-4 text-slate-400 transition-transform",
          isOpen && "rotate-180"
        )}
      />
    </button>
    {isOpen ? <div className="mt-4">{children}</div> : null}
  </div>
);

const GrassSvg = ({ level }: { level: number }) => {
  const blades = Array.from({ length: 5 }, (_, index) => index);

  return (
    <svg
      aria-hidden="true"
      className="h-14 w-full text-lime-300"
      fill="none"
      viewBox="0 0 120 56"
    >
      <path d="M8 48H112" stroke="currentColor" strokeLinecap="round" />
      {blades.map((blade) => {
        const height = 12 + level * 8 + blade * 2;
        const x = 24 + blade * 16;
        return (
          <path
            d={`M${x} 48 C${x - 8} ${48 - height / 2}, ${x - 3} ${
              48 - height
            }, ${x + 8} ${48 - height - 2}`}
            key={blade}
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="3"
          />
        );
      })}
    </svg>
  );
};

const getFileExtension = (fileName: string) => {
  const extension = fileName.split(".").at(-1);
  return extension && extension !== fileName ? extension.toUpperCase() : "FILE";
};

const AttachmentCard = ({
  fileName,
  onRemove,
}: {
  fileName: string;
  onRemove: () => void;
}) => (
  <div className="relative flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
      <FileImage className="size-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-slate-950">
        {fileName}
      </span>
      <span className="mt-0.5 block text-xs font-semibold text-slate-400">
        {getFileExtension(fileName)}
      </span>
    </span>
    <button
      aria-label={`Remove ${fileName}`}
      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
      onClick={onRemove}
      type="button"
    >
      <X className="size-3.5" />
    </button>
  </div>
);

const ServicePhotoUpload = ({
  fileNames,
  onFiles,
}: {
  fileNames: string[];
  onFiles: (fileNames: string[]) => void;
}) => {
  const appendFiles = (files: File[]) => {
    const nextFileNames = [...fileNames];
    for (const file of files) {
      if (!nextFileNames.includes(file.name)) {
        nextFileNames.push(file.name);
      }
    }
    onFiles(nextFileNames);
  };

  return (
    <div className="grid gap-3">
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 transition-colors hover:border-cyan-500">
        <span className="flex items-center gap-3">
          <Upload className="size-4" />
          Add photos for faster quote review
        </span>
        <span className="text-xs text-slate-400">{fileNames.length} files</span>
        <input
          accept="image/*"
          className="sr-only"
          multiple
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            appendFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
          type="file"
        />
      </label>
      {fileNames.length > 0 ? (
        <fieldset
          aria-label="Attached files"
          className="grid gap-2 sm:grid-cols-2"
        >
          {fileNames.map((fileName) => (
            <AttachmentCard
              fileName={fileName}
              key={fileName}
              onRemove={() =>
                onFiles(fileNames.filter((current) => current !== fileName))
              }
            />
          ))}
        </fieldset>
      ) : null}
    </div>
  );
};

const ProductAccordion = ({
  draft,
  isOpen,
  onIncludeBedding,
  onOpen,
  onSelect,
  products,
  selectedProductId,
  serviceId,
}: {
  draft: BookingDraft;
  isOpen: boolean;
  onIncludeBedding?: () => void;
  onOpen: () => void;
  onSelect: (productId: string) => void;
  products: readonly ProductOption[];
  selectedProductId?: string;
  serviceId: ServiceId;
}) => {
  const selectedProduct = products.find(({ id }) => id === selectedProductId);
  const oneTimeProducts = products.filter((product) => !product.recurring);
  const recurringProducts = products.filter((product) => product.recurring);
  const renderProductButton = (product: ProductOption) => (
    <button
      className={cn(
        "rounded-2xl border p-4 text-left transition-colors",
        selectedProductId === product.id
          ? "border-lime-500 bg-lime-100"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
      key={product.id}
      onClick={() => onSelect(product.id)}
      type="button"
    >
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-950">
              {getProductSelectionName(product, serviceId)}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {product.description}
            </p>
          </div>
          <span className="shrink-0 font-black text-lime-700">
            {formatCents(getProductPriceCents(draft, serviceId, product))}
          </span>
        </div>
        {product.recurring ? (
          <p className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
            <Sparkles className="size-3" />
            Plan
          </p>
        ) : null}
      </div>
    </button>
  );

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50">
      <button
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
        onClick={onOpen}
        type="button"
      >
        <div>
          <p className="font-bold text-slate-950">
            {getServiceLabel(serviceId)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {selectedProduct?.name ?? "Choose one product"}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-slate-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen ? (
        <div className="grid gap-3 p-4 pt-0">
          {serviceId === "laundry" &&
          draft.serviceDetails.laundry.bedding === "none" &&
          onIncludeBedding ? (
            <button
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-lime-300 bg-lime-50 p-4 text-left transition-colors hover:border-lime-400 hover:bg-lime-100"
              onClick={onIncludeBedding}
              type="button"
            >
              <div>
                <p className="font-semibold text-slate-950">
                  Add bedding for {formatCents(beddingUpgradeCents)} more
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Sheets, duvet covers, and heavier linens washed and folded
                  with your pickup.
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-lime-700" />
            </button>
          ) : null}
          <div className="grid gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              One-time
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {oneTimeProducts.map(renderProductButton)}
            </div>
          </div>
          {recurringProducts.length > 0 ? (
            <div className="grid gap-3 border-t border-slate-200 pt-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Plans
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {recurringProducts.map(renderProductButton)}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

// eslint-disable-next-line complexity
const BookingWizard = (props: BookingWizardProps) => {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const isReturningCustomer = Boolean(session?.user);
  const storedDraft = parseStoredDraft();
  const hasStoredDraft =
    Boolean(storedDraft) &&
    !props.initialResumeDraft &&
    props.initialServices.length === 0 &&
    !props.initialAddress &&
    !props.initialAddressId;
  const [shouldShowStoredDraft, setShouldShowStoredDraft] =
    useState(hasStoredDraft);
  const quoteRequestTrackingId = useMemo(() => {
    if (props.initialQuoteRequestId) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(trackingKey, props.initialQuoteRequestId);
      }
      return props.initialQuoteRequestId;
    }

    return getOrCreateTrackingId();
  }, [props.initialQuoteRequestId]);
  const [draft, setDraft] = useState<BookingDraft>(() =>
    sanitizeDraftForCurrentCart(buildInitialDraft(props, storedDraft))
  );
  const [activeStep, setActiveStep] = useState<WizardStep>(() =>
    resolveInitialStep(props, storedDraft)
  );
  const [openProductService, setOpenProductService] =
    useState<ServiceId | null>(draft.services[0] ?? null);
  const [openDetailService, setOpenDetailService] = useState<ServiceId | null>(
    draft.services[0] ?? null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAddressValidated, setIsAddressValidated] = useState(
    Boolean(draft.addressId)
  );
  const [checkoutError, setCheckoutError] = useState("");
  const [hasServerQuoteRoute, setHasServerQuoteRoute] = useState(
    Boolean(props.initialQuoteRequestId)
  );
  const [isQuoteRequestLoading, setIsQuoteRequestLoading] = useState(
    Boolean(props.initialQuoteRequestId)
  );
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [allowCashCheckout, setAllowCashCheckout] = useState(true);

  useEffect(() => {
    let active = true;

    const loadCheckoutSettings = async () => {
      try {
        const response = await fetch(
          new URL("/api/v1/checkout/settings", getServerUrl())
        );
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          allowCashCheckout: boolean;
        };
        if (active && typeof payload.allowCashCheckout === "boolean") {
          setAllowCashCheckout(payload.allowCashCheckout);
          setDraft((current) => ({
            ...current,
            paymentOption:
              payload.allowCashCheckout ||
              current.paymentOption !== "deposit_cash"
                ? current.paymentOption
                : "",
          }));
        }
      } catch {
        // Keep the cash option available when settings cannot be loaded.
      }
    };

    void loadCheckoutSettings();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (
      isReturningCustomer &&
      draft.serviceDetails.laundry.pickupMode === "knock"
    ) {
      // eslint-disable-next-line react/react-compiler -- Reset the stored pickup mode once the session confirms a returning customer.
      setDraft((current) => ({
        ...current,
        serviceDetails: {
          ...current.serviceDetails,
          laundry: {
            ...current.serviceDetails.laundry,
            pickupMode: "outside",
          },
        },
      }));
    }
  }, [draft.serviceDetails.laundry.pickupMode, isReturningCustomer]);

  useEffect(() => {
    if (!props.initialQuoteRequestId) {
      return;
    }

    let isActive = true;

    const loadQuoteRequest = async () => {
      setIsQuoteRequestLoading(true);
      const quoteRequest = await fetchQuoteRequestDraft(
        props.initialQuoteRequestId ?? ""
      );

      if (!isActive) {
        return;
      }

      if (quoteRequest?.payload) {
        const quoteDraft = quoteRequest.payload as unknown as BookingDraft;
        const nextDraft = sanitizeDraftForCurrentCart(
          buildInitialDraft(
            {
              initialAddress: props.initialAddress,
              initialAddressId: props.initialAddressId,
              initialContact: props.initialContact,
              initialDate: props.initialDate,
              initialQuoteRequestId: props.initialQuoteRequestId,
              initialResumeDraft: true,
              initialServices: props.initialServices,
              initialStep: props.initialStep,
              initialTimeSlot: props.initialTimeSlot,
            },
            quoteDraft
          )
        );
        setDraft(nextDraft);
        setOpenDetailService(nextDraft.services[0] ?? null);
        setOpenProductService(nextDraft.services[0] ?? null);
        setActiveStep(
          Math.min(quoteRequest.lastCompletedStep ?? 0, 5) as WizardStep
        );
      }

      setIsQuoteRequestLoading(false);
    };

    void loadQuoteRequest();

    return () => {
      isActive = false;
    };
  }, [
    props.initialAddress,
    props.initialAddressId,
    props.initialContact,
    props.initialDate,
    props.initialQuoteRequestId,
    props.initialServices,
    props.initialStep,
    props.initialTimeSlot,
  ]);

  const enrichDraftPropertyIfNeeded = useCallback(async () => {
    if (!draft.address || draft.address.trim().length < 5) {
      return draft;
    }

    if (draft.property && draft.travel) {
      return draft;
    }

    const validated = await validateAddress(draft.address, {
      includeProperty: true,
    });
    if (!validated) {
      return draft;
    }

    const nextDraft = pruneInvalidProductSelections({
      ...draft,
      address: validated.label,
      addressId: null,
      addressLatitude: validated.latitude,
      addressLongitude: validated.longitude,
      addressStateCode: validated.stateCode ?? null,
      marketMode: validated.market?.mode ?? null,
      property: validated.property ?? draft.property ?? null,
      travel: validated.travel ?? draft.travel ?? null,
    });
    setDraft(nextDraft);
    setIsAddressValidated(true);
    return nextDraft;
  }, [draft]);

  useEffect(() => {
    let active = true;
    if (
      draft.address &&
      draft.address.trim().length >= 5 &&
      (!draft.property || !draft.travel)
    ) {
      const timer = setTimeout(() => {
        if (active) {
          void enrichDraftPropertyIfNeeded();
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [
    draft.address,
    draft.property,
    draft.travel,
    enrichDraftPropertyIfNeeded,
  ]);

  const paymentOptionsForDraft = getPaymentOptionsForDraft(
    draft,
    allowCashCheckout
  );

  const setDraftValue = <Key extends keyof BookingDraft>(
    key: Key,
    value: BookingDraft[Key]
  ) => {
    setDraft((current) =>
      pruneInvalidProductSelections({ ...current, [key]: value })
    );
    setErrors({});
  };

  const goToStep = (
    step: WizardStep,
    preferQuoteRoute = hasServerQuoteRoute
  ) => {
    setActiveStep(step);
    if (preferQuoteRoute && quoteRequestTrackingId) {
      navigate({
        params: { trackingId: quoteRequestTrackingId },
        replace: true,
        search: { step: stepKeys[step] },
        to: "/book/q/$trackingId",
      });
      return;
    }

    navigate({
      replace: true,
      search: (current) =>
        ({
          ...current,
          step: stepKeys[step],
        }) as { step: WizardStepKey },
      to: "/book",
    });
  };

  const clearDraft = () => {
    const nextDraft = emptyDraft(props);
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(trackingKey);
    setDraft(nextDraft);
    setErrors({});
    setIsAddressValidated(false);
    setOpenDetailService(null);
    setOpenProductService(null);
    setShouldShowStoredDraft(false);
    setActiveStep(0);
    navigate({
      replace: true,
      search: { step: "schedule" as const } as never,
    });
  };

  const resumeStoredDraft = () => {
    const nextDraft = sanitizeDraftForCurrentCart(
      buildInitialDraft({ ...props, initialResumeDraft: true }, storedDraft)
    );
    setDraft(nextDraft);
    setOpenDetailService(nextDraft.services[0] ?? null);
    setOpenProductService(nextDraft.services[0] ?? null);
    setErrors({});
    setShouldShowStoredDraft(false);
    navigate({
      replace: true,
      search: (current) =>
        ({
          ...current,
          resume: true,
        }) as never,
    });
  };

  const toggleService = (serviceId: ServiceId) => {
    setDraft((current) => {
      const exists = current.services.includes(serviceId);
      const services = exists
        ? current.services.filter((id) => id !== serviceId)
        : [...current.services, serviceId];
      const nextServices = sortServiceIds(services);
      const nextDraft = pruneInvalidProductSelections({
        ...current,
        paymentOption: "",
        products: pruneProductsForServices({
          ...current,
          services: nextServices,
        }),
        services: nextServices,
        subscriptionId: "",
      });

      if (!openDetailService || !nextServices.includes(openDetailService)) {
        setOpenDetailService(nextServices[0] ?? null);
      }
      if (!openProductService || !nextServices.includes(openProductService)) {
        setOpenProductService(nextServices[0] ?? null);
      }

      return nextDraft;
    });
  };

  const validateStep = (step: WizardStep) => {
    const nextErrors = getStepErrors(draft, step, allowCashCheckout);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const continueFromStep = async (step: WizardStep) => {
    if (!validateStep(step)) {
      return;
    }

    const nextDraft = step === 0 ? await enrichDraftPropertyIfNeeded() : draft;
    let shouldUseQuoteRoute = hasServerQuoteRoute;
    if (step >= 1) {
      shouldUseQuoteRoute = await persistQuoteRequest({
        draft: nextDraft,
        lastCompletedStep: step + 1,
        status: step >= 4 ? "checkout_started" : "contact_captured",
        trackingId: quoteRequestTrackingId,
      });
      if (shouldUseQuoteRoute) {
        setHasServerQuoteRoute(true);
      }
    }

    goToStep(Math.min(step + 1, 5) as WizardStep, shouldUseQuoteRoute);
  };

  const selectProduct = (serviceId: ServiceId, productId: string) => {
    const selectedProduct = getEligibleProductsForDraft(draft, serviceId).find(
      ({ id }) => id === productId
    );
    if (!selectedProduct) {
      return;
    }

    setDraft((current) => ({
      ...current,
      paymentOption: selectedProduct?.recurring ? "pay_full" : "",
      products: { ...current.products, [serviceId]: productId },
      subscriptionId: "",
    }));
    const currentIndex = draft.services.indexOf(serviceId);
    const nextService = draft.services[currentIndex + 1];
    if (nextService) {
      setOpenProductService(nextService);
      return;
    }
    goToStep(4);
  };

  const completeServiceDetails = (serviceId: ServiceId) => {
    const currentIndex = draft.services.indexOf(serviceId);
    const nextService = draft.services[currentIndex + 1];
    if (nextService) {
      setOpenDetailService(nextService);
      return;
    }
    setOpenDetailService(serviceId);
  };

  const validateSelectedAddress = async (
    suggestion: RadarAddressSuggestion
  ) => {
    const validated = await validateAddress(suggestion.label, {
      includeProperty: true,
    });
    const selected = validated ?? suggestion;
    setDraft((current) =>
      pruneInvalidProductSelections({
        ...current,
        address: selected.label,
        addressId: null,
        addressLatitude: selected.latitude,
        addressLongitude: selected.longitude,
        addressStateCode: selected.stateCode ?? null,
        marketMode: selected.market?.mode ?? null,
        property: selected.property ?? null,
        travel: selected.travel ?? null,
      })
    );
    setErrors({});
    setIsAddressValidated(true);
  };

  const startSecureCheckout = async () => {
    if (!validateStep(5)) {
      return;
    }

    setCheckoutError("");
    setIsCheckoutSubmitting(true);

    try {
      const checkoutAddOns = getQuoteAddOns(draft);
      let checkoutAddOnTotal = 0;
      for (const addOn of checkoutAddOns) {
        checkoutAddOnTotal += addOn.priceCents;
      }
      const checkoutSubtotal =
        (hasSubscriptionCheckout(draft)
          ? (getSubscriptionPriceCents(draft) ?? 0)
          : selectedProductTotal(draft) + checkoutAddOnTotal) ||
        selectedProductTotal(draft) + checkoutAddOnTotal;
      const checkoutTipCents =
        getDraftTipAmountCents(draft, checkoutSubtotal) ?? 0;

      await persistQuoteRequest({
        draft,
        lastCompletedStep: 6,
        status: "checkout_started",
        trackingId: quoteRequestTrackingId,
      });

      const response = await fetch(
        new URL("/api/v1/checkout/confirm", getServerUrl()),
        {
          body: JSON.stringify({
            address: draft.addressId ? undefined : draft.address,
            addressId: draft.addressId ?? undefined,
            contact: draft.contact,
            items: getCheckoutItems(draft),
            paymentOption: draft.paymentOption,
            tipAmountCents: checkoutTipCents,
            travelDistanceMiles: draft.travel?.distanceMiles,
            travelFeeCents: draft.travel?.feeCents ?? 0,
            travelStateCode: draft.addressStateCode,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        }
      );

      const payload = (await response.json()) as {
        checkoutUrl?: string;
        error?: unknown;
      };

      if (!(response.ok && payload.checkoutUrl)) {
        setCheckoutError(
          typeof payload.error === "string"
            ? payload.error
            : "Checkout could not be started. Please review your details and try again."
        );
        return;
      }

      window.location.assign(payload.checkoutUrl);
    } catch {
      setCheckoutError(
        "Checkout could not be started. Please try again in a moment."
      );
    } finally {
      setIsCheckoutSubmitting(false);
    }
  };

  const shownCombos = getEligibleCombos(draft);
  const quoteAddOns = getQuoteAddOns(draft);
  let addOnTotalCents = 0;
  for (const addOn of quoteAddOns) {
    addOnTotalCents += addOn.priceCents;
  }
  const selectedCombo =
    draft.subscriptionId && draft.subscriptionId !== "one_time"
      ? comboSubscriptions.find((combo) => combo.id === draft.subscriptionId)
      : null;
  const hasRecurringProductSelected = hasSelectedRecurringProduct(draft);
  const hasSubscriptionSelected = hasSubscriptionCheckout(draft);
  const planEstimateCents = selectedCombo
    ? getSubscriptionPriceCents(draft)
    : null;
  const servicesSubtotalCents =
    planEstimateCents ?? selectedProductTotal(draft) + addOnTotalCents;

  const travelFeeCents = draft.travel?.feeCents ?? 0;
  const techFeeCents = TECHNOLOGY_FEE_CENTS;
  const feesTotalCents = travelFeeCents + techFeeCents;
  const preTipTotalCents = servicesSubtotalCents + feesTotalCents;

  const tipAmountCents =
    getDraftTipAmountCents(draft, servicesSubtotalCents) ?? 0;
  const estimatedTotalCents = preTipTotalCents + tipAmountCents;
  const depositCents = 5000;
  const isLaundryOnly =
    draft.services.length === 1 && draft.services[0] === "laundry";
  const shouldChargeFullAmountToday =
    draft.paymentOption === "pay_full" ||
    isLaundryOnly ||
    hasSubscriptionSelected;
  const dueTodayCents = shouldChargeFullAmountToday
    ? estimatedTotalCents
    : Math.min(depositCents, preTipTotalCents);
  const hasRecurringProduct = draft.services.some((serviceId) =>
    productsByService[serviceId].some(
      (product) => product.id === draft.products[serviceId] && product.recurring
    )
  );

  if (isQuoteRequestLoading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-slate-950 shadow-2xl shadow-slate-200/70">
        <p className="text-sm font-black uppercase tracking-widest text-lime-700">
          Loading quote
        </p>
        <p className="mt-3 text-base font-semibold text-slate-600">
          Pulling your saved CastleCare booking details.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <StepProgress activeStep={activeStep} onStepSelect={goToStep} />
      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 text-slate-950 shadow-2xl shadow-slate-200/70 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-h-8">
            {shouldShowStoredDraft ? (
              <button
                className="text-sm font-semibold text-lime-700 underline-offset-4 hover:underline"
                onClick={resumeStoredDraft}
                type="button"
              >
                Continue where you left off
              </button>
            ) : null}
          </div>
          <button
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-950"
            onClick={clearDraft}
            type="button"
          >
            Clear booking
          </button>
        </div>
        <StepPanel
          isComplete={basicsSchema.safeParse(draft).success}
          isOpen={activeStep === 0}
          number="01"
          title="Services and schedule"
        >
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-2">
              {serviceCatalog.map((service) => {
                const Icon = service.icon;
                const selected = draft.services.includes(service.id);

                return (
                  <button
                    className={cn(
                      "flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center transition-colors sm:p-3",
                      selected
                        ? "border-lime-500 bg-lime-100 text-slate-950"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                    )}
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    type="button"
                  >
                    <Icon className="size-5" />
                    <span className="text-xs font-semibold sm:text-sm">
                      {service.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.services ? (
              <p className="text-sm text-rose-600">{errors.services}</p>
            ) : null}

            <div className="grid gap-4">
              <div className="flex flex-col gap-2">
                <RequiredLabel>Service address</RequiredLabel>
                {props.savedAddresses && props.savedAddresses.length > 0 ? (
                  <select
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-lime-500"
                    onChange={(event) => {
                      const selectedId = Number(event.target.value);
                      const selected = props.savedAddresses?.find(
                        (address) => address.id === selectedId
                      );

                      if (!selected) {
                        setDraft((current) => ({
                          ...current,
                          addressId: null,
                        }));
                        setErrors({});
                        setIsAddressValidated(false);
                        return;
                      }

                      const formattedAddress =
                        selected.formattedAddress ??
                        [
                          selected.street,
                          selected.city,
                          selected.state,
                          selected.zip,
                        ]
                          .filter(Boolean)
                          .join(", ");

                      setDraft((current) =>
                        pruneInvalidProductSelections({
                          ...current,
                          address: formattedAddress,
                          addressId: selected.id,
                          addressLatitude: selected.latitude ?? null,
                          addressLongitude: selected.longitude ?? null,
                          addressStateCode: selected.state,
                          property: null,
                        })
                      );
                      setErrors({});
                      setIsAddressValidated(selected.isValidated);
                    }}
                    value={draft.addressId ?? ""}
                  >
                    <option value="">Use a new address</option>
                    {props.savedAddresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.label} -{" "}
                        {address.formattedAddress ??
                          `${address.street}, ${address.city}`}
                      </option>
                    ))}
                  </select>
                ) : null}
                <RadarAddressInput
                  className="border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus-visible:border-lime-500"
                  disabled={Boolean(draft.addressId)}
                  error={errors.address}
                  isValidated={isAddressValidated}
                  onChange={(address) => {
                    setIsAddressValidated(false);
                    setDraft((current) =>
                      pruneInvalidProductSelections({
                        ...current,
                        address,
                        addressId: null,
                        property: null,
                      })
                    );
                    setErrors({});
                  }}
                  onSelectSuggestion={(suggestion: RadarAddressSuggestion) => {
                    setDraft((current) =>
                      pruneInvalidProductSelections({
                        ...current,
                        address: suggestion.label,
                        addressId: null,
                        property: suggestion.property ?? null,
                      })
                    );
                    setErrors({});
                    setIsAddressValidated(true);
                    void validateSelectedAddress(suggestion);
                  }}
                  value={draft.address}
                />
                {errors.address ? (
                  <p className="text-sm text-rose-600">{errors.address}</p>
                ) : null}
              </div>

              {draft.travel && draft.travel.feeCents > 0 ? (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-600">
                  <Info className="size-4 shrink-0 text-slate-400" />
                  <span>
                    A travel fee will apply at checkout for this location.
                  </span>
                </div>
              ) : null}

              <ScheduleDateTimePicker
                date={draft.date}
                dateError={errors.date}
                driveMinutes={draft.travel?.driveMinutes ?? 0}
                latitude={draft.addressLatitude}
                longitude={draft.addressLongitude}
                onDateChange={(value) => setDraftValue("date", value)}
                onTimeSlotChange={(value) => setDraftValue("timeSlot", value)}
                stateCode={draft.addressStateCode}
                timeSlot={draft.timeSlot}
              />
            </div>

            <StepButton onClick={() => void continueFromStep(0)} />
          </div>
        </StepPanel>

        <StepPanel
          isComplete={contactSchema.safeParse(draft.contact).success}
          isOpen={activeStep === 1}
          number="02"
          title="Contact information"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <RoundedField
              error={errors["contact.name"]}
              icon={User}
              label="Name"
              onChange={(event) =>
                setDraftValue("contact", {
                  ...draft.contact,
                  name: event.target.value,
                })
              }
              placeholder="Your name"
              required
              value={draft.contact.name}
            />
            <RoundedField
              error={errors["contact.phone"]}
              icon={Phone}
              label="Phone"
              onChange={(event) =>
                setDraftValue("contact", {
                  ...draft.contact,
                  phone: formatUsPhoneInput(event.target.value),
                })
              }
              inputMode="tel"
              pattern="[0-9\s()+.-]*"
              placeholder="(501) 555-0123"
              required
              type="tel"
              value={draft.contact.phone}
            />
            <RoundedField
              error={errors["contact.email"]}
              icon={Mail}
              label="Email"
              onChange={(event) =>
                setDraftValue("contact", {
                  ...draft.contact,
                  email: event.target.value,
                })
              }
              placeholder="you@example.com"
              required
              type="email"
              value={draft.contact.email}
            />
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:col-span-3">
              <input
                checked={draft.contact.smsUpdates}
                className="size-4 rounded border-slate-300 accent-lime-500"
                onChange={(event) =>
                  setDraftValue("contact", {
                    ...draft.contact,
                    smsUpdates: event.target.checked,
                  })
                }
                type="checkbox"
              />
              Yes, send text updates about this quote and appointment.
            </label>
          </div>
          <StepActions onBack={() => goToStep(0)}>
            <StepButton onClick={() => void continueFromStep(1)} />
          </StepActions>
        </StepPanel>

        <StepPanel
          isComplete={Object.keys(errors).length === 0 && activeStep > 2}
          isOpen={activeStep === 2}
          number="03"
          title="Service details"
        >
          <div className="grid gap-4">
            {draft.services.includes("lawncare") ? (
              <QuestionAccordion
                icon={serviceQuestionIcons.grass}
                isComplete={Boolean(
                  draft.serviceDetails.lawncare.grassHeight &&
                  draft.serviceDetails.lawncare.hasPets
                )}
                isOpen={openDetailService === "lawncare"}
                onOpen={() => setOpenDetailService("lawncare")}
                title="How tall is the grass?"
              >
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {grassHeights.map((height, index) => (
                    <button
                      className={cn(
                        "rounded-2xl border p-2 text-left transition-colors sm:p-4",
                        draft.serviceDetails.lawncare.grassHeight === height.id
                          ? "border-lime-500 bg-lime-100 text-slate-950"
                          : "border-slate-200 bg-white text-slate-600"
                      )}
                      key={height.id}
                      onClick={() => {
                        setDraftValue("serviceDetails", {
                          ...draft.serviceDetails,
                          lawncare: {
                            ...draft.serviceDetails.lawncare,
                            grassHeight: height.id,
                          },
                        });
                      }}
                      type="button"
                    >
                      <GrassSvg level={index + 1} />
                      <p className="mt-2 text-sm font-semibold sm:mt-3 sm:text-base">
                        {height.name}
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                        {height.description}
                      </p>
                    </button>
                  ))}
                </div>
                {errors.grassHeight ? (
                  <p className="mt-1 text-sm text-rose-600 font-medium">
                    {errors.grassHeight}
                  </p>
                ) : null}
                <div className="mt-4 grid gap-3">
                  <p className="text-sm font-semibold text-slate-950">
                    Any pets on the property?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["no", "No pets"],
                        ["yes", "Yes, pets on site"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        className={cn(
                          "rounded-2xl border p-3 text-left text-sm font-semibold",
                          draft.serviceDetails.lawncare.hasPets === id
                            ? "border-lime-500 bg-lime-100"
                            : "border-slate-200 bg-white"
                        )}
                        key={id}
                        onClick={() => {
                          const nextLawn = {
                            ...draft.serviceDetails.lawncare,
                            hasPets: id,
                          };
                          setDraftValue("serviceDetails", {
                            ...draft.serviceDetails,
                            lawncare: nextLawn,
                          });
                          if (nextLawn.grassHeight) {
                            completeServiceDetails("lawncare");
                          }
                        }}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {errors.hasPets ? (
                    <p className="text-sm font-medium text-rose-600">
                      {errors.hasPets}
                    </p>
                  ) : null}
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-semibold text-slate-950">
                      Obstacles or items to move? (optional)
                    </span>
                    <textarea
                      className="min-h-20 rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-lime-500"
                      onChange={(event) =>
                        setDraftValue("serviceDetails", {
                          ...draft.serviceDetails,
                          lawncare: {
                            ...draft.serviceDetails.lawncare,
                            obstacles: event.target.value,
                          },
                        })
                      }
                      placeholder="Toys, furniture, locked gates, steep slopes..."
                      value={draft.serviceDetails.lawncare.obstacles}
                    />
                  </label>
                </div>
                <div className="mt-4">
                  <ServicePhotoUpload
                    fileNames={draft.serviceDetails.lawncare.photoNames}
                    onFiles={(photoNames) =>
                      setDraftValue("serviceDetails", {
                        ...draft.serviceDetails,
                        lawncare: {
                          ...draft.serviceDetails.lawncare,
                          photoNames,
                        },
                      })
                    }
                  />
                </div>
              </QuestionAccordion>
            ) : null}

            {draft.services.includes("laundry") ? (
              <QuestionAccordion
                icon={serviceQuestionIcons.bedding}
                isComplete={Boolean(
                  draft.serviceDetails.laundry.bedding &&
                  draft.serviceDetails.laundry.pickupMode
                )}
                isOpen={openDetailService === "laundry"}
                onOpen={() => setOpenDetailService("laundry")}
                title="Will this include bedding?"
              >
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {[
                    ["none", "No bedding", "Clothes, towels, and basics."],
                    [
                      "with-bedding",
                      "Include bedding",
                      "Sheets, duvet covers, or heavier linens.",
                    ],
                  ].map(([id, name, description]) => (
                    <button
                      className={cn(
                        "rounded-2xl border p-3 text-left transition-colors sm:p-4",
                        draft.serviceDetails.laundry.bedding === id
                          ? "border-sky-500 bg-sky-50 text-slate-950"
                          : "border-slate-200 bg-white text-slate-600"
                      )}
                      key={id}
                      onClick={() => {
                        setDraftValue("serviceDetails", {
                          ...draft.serviceDetails,
                          laundry: {
                            ...draft.serviceDetails.laundry,
                            bedding: id as "none" | "with-bedding",
                          },
                        });
                      }}
                      type="button"
                    >
                      <p className="text-sm font-semibold sm:text-base">
                        {name}
                      </p>
                      <p className="mt-2 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                        {description}
                      </p>
                    </button>
                  ))}
                </div>
                {errors.bedding ? (
                  <p className="text-sm text-rose-300">{errors.bedding}</p>
                ) : null}
                <div className="mt-4 grid gap-3">
                  <p className="text-sm font-semibold text-slate-950">
                    How should we collect the bag?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        [
                          "outside",
                          "Outside (contactless)",
                          "Leave the CastleCare bag outside for pickup.",
                        ],
                        [
                          "knock",
                          "Knock to collect",
                          "We knock and collect the bag from you.",
                        ],
                      ] as const
                    )
                      .filter(([id]) => !isReturningCustomer || id !== "knock")
                      .map(([id, name, description]) => (
                        <button
                          className={cn(
                            "rounded-2xl border p-3 text-left transition-colors",
                            draft.serviceDetails.laundry.pickupMode === id
                              ? "border-sky-500 bg-sky-50 text-slate-950"
                              : "border-slate-200 bg-white text-slate-600"
                          )}
                          key={id}
                          onClick={() => {
                            const nextLaundry = {
                              ...draft.serviceDetails.laundry,
                              pickupMode: id,
                            };
                            setDraftValue("serviceDetails", {
                              ...draft.serviceDetails,
                              laundry: nextLaundry,
                            });
                            if (nextLaundry.bedding) {
                              completeServiceDetails("laundry");
                            }
                          }}
                          type="button"
                        >
                          <p className="text-sm font-semibold">{name}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {description}
                          </p>
                        </button>
                      ))}
                  </div>
                  {errors.pickupMode ? (
                    <p className="text-sm text-rose-600">{errors.pickupMode}</p>
                  ) : null}
                </div>
                <div className="mt-4">
                  <ServicePhotoUpload
                    fileNames={draft.serviceDetails.laundry.photoNames}
                    onFiles={(photoNames) =>
                      setDraftValue("serviceDetails", {
                        ...draft.serviceDetails,
                        laundry: {
                          ...draft.serviceDetails.laundry,
                          photoNames,
                        },
                      })
                    }
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Optional: front-of-house photo helps us confirm the right
                    address on laundry-only visits.
                  </p>
                </div>
              </QuestionAccordion>
            ) : null}

            {draft.services.includes("window-washing") ? (
              <QuestionAccordion
                icon={serviceQuestionIcons.windows}
                isComplete={
                  Boolean(
                    draft.serviceDetails["window-washing"].cleaningScope &&
                    draft.serviceDetails["window-washing"].stories
                  ) &&
                  (draft.serviceDetails["window-washing"].finalizeOnSite ||
                    Boolean(
                      draft.serviceDetails["window-washing"].windowEstimate
                    ))
                }
                isOpen={openDetailService === "window-washing"}
                onOpen={() => setOpenDetailService("window-washing")}
                title="Tell us about the windows"
              >
                <div className="grid gap-4">
                  <div>
                    <Label className="text-slate-600">Glass service</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-3">
                      {[
                        [
                          "exterior",
                          "Exterior only",
                          "Outside glass wash for the selected panes.",
                        ],
                        [
                          "both",
                          "Inside and out",
                          "Adds inside glass care based on pane estimate.",
                        ],
                      ].map(([id, name, description]) => (
                        <button
                          className={cn(
                            "rounded-2xl border p-3 text-left transition-colors sm:p-4",
                            draft.serviceDetails["window-washing"]
                              .cleaningScope === id
                              ? "border-cyan-500 bg-cyan-50 text-slate-950"
                              : "border-slate-200 bg-white text-slate-600"
                          )}
                          key={id}
                          onClick={() =>
                            setDraftValue("serviceDetails", {
                              ...draft.serviceDetails,
                              "window-washing": {
                                ...draft.serviceDetails["window-washing"],
                                cleaningScope: id as "exterior" | "both",
                              },
                            })
                          }
                          type="button"
                        >
                          <p className="text-sm font-semibold sm:text-base">
                            {name}
                          </p>
                          <p className="mt-2 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                            {description}
                          </p>
                        </button>
                      ))}
                    </div>
                    {errors.cleaningScope ? (
                      <p className="mt-2 text-sm text-rose-300">
                        {errors.cleaningScope}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-slate-600">Stories</Label>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {["1", "2", "3"].map((story) => (
                          <button
                            className={cn(
                              "rounded-2xl border p-4 text-center text-sm font-semibold transition-colors",
                              draft.serviceDetails["window-washing"].stories ===
                                story
                                ? "border-cyan-500 bg-cyan-50 text-slate-950"
                                : "border-slate-200 bg-white text-slate-600"
                            )}
                            key={story}
                            onClick={() =>
                              setDraftValue("serviceDetails", {
                                ...draft.serviceDetails,
                                "window-washing": {
                                  ...draft.serviceDetails["window-washing"],
                                  stories: story as "1" | "2" | "3",
                                },
                              })
                            }
                            type="button"
                          >
                            {story}
                          </button>
                        ))}
                      </div>
                      {errors.stories ? (
                        <p className="mt-2 text-sm text-rose-300">
                          {errors.stories}
                        </p>
                      ) : null}
                    </div>

                    <RoundedField
                      disabled={
                        draft.serviceDetails["window-washing"].finalizeOnSite
                      }
                      error={errors.windowEstimate}
                      label="Rough window estimate"
                      onChange={(event) =>
                        setDraftValue("serviceDetails", {
                          ...draft.serviceDetails,
                          "window-washing": {
                            ...draft.serviceDetails["window-washing"],
                            windowEstimate: normalizeIntegerInput(
                              event.target.value
                            ),
                          },
                        })
                      }
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Around 20"
                      value={
                        draft.serviceDetails["window-washing"].windowEstimate
                      }
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3 text-sm text-slate-700">
                      <input
                        checked={
                          draft.serviceDetails["window-washing"].finalizeOnSite
                        }
                        className="mt-1 size-4 rounded border-slate-300 accent-lime-500"
                        onChange={(event) =>
                          setDraftValue("serviceDetails", {
                            ...draft.serviceDetails,
                            "window-washing": {
                              ...draft.serviceDetails["window-washing"],
                              finalizeOnSite: event.target.checked,
                            },
                          })
                        }
                        id="window-finalize-on-site"
                        type="checkbox"
                      />
                      <span>
                        <Label
                          className="block font-semibold text-slate-950"
                          htmlFor="window-finalize-on-site"
                        >
                          Finalize glass count on site
                        </Label>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          Skip exact pane or screen counts now. The provider can
                          verify the quote during the visit.
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px]">
                    <div className="flex items-start gap-3 text-sm text-slate-700">
                      <input
                        checked={
                          draft.serviceDetails["window-washing"].washScreens
                        }
                        className="mt-1 size-4 rounded border-slate-300 accent-lime-500"
                        id="window-screen-wash"
                        onChange={(event) =>
                          setDraftValue("serviceDetails", {
                            ...draft.serviceDetails,
                            "window-washing": {
                              ...draft.serviceDetails["window-washing"],
                              washScreens: event.target.checked,
                            },
                          })
                        }
                        type="checkbox"
                      />
                      <span>
                        <Label
                          className="block font-semibold text-slate-950"
                          htmlFor="window-screen-wash"
                        >
                          Wash screens
                        </Label>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          Adds {formatCents(screenWashFeePerScreenCents)} per
                          screen.
                        </span>
                      </span>
                    </div>

                    {draft.serviceDetails["window-washing"].washScreens &&
                    !draft.serviceDetails["window-washing"].finalizeOnSite ? (
                      <RoundedField
                        error={errors.screenCount}
                        label="Screen count"
                        onChange={(event) =>
                          setDraftValue("serviceDetails", {
                            ...draft.serviceDetails,
                            "window-washing": {
                              ...draft.serviceDetails["window-washing"],
                              screenCount: normalizeIntegerInput(
                                event.target.value
                              ),
                            },
                          })
                        }
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="12"
                        value={
                          draft.serviceDetails["window-washing"].screenCount
                        }
                      />
                    ) : null}
                  </div>

                  <ServicePhotoUpload
                    fileNames={
                      draft.serviceDetails["window-washing"].photoNames
                    }
                    onFiles={(photoNames) =>
                      setDraftValue("serviceDetails", {
                        ...draft.serviceDetails,
                        "window-washing": {
                          ...draft.serviceDetails["window-washing"],
                          photoNames,
                        },
                      })
                    }
                  />
                </div>
              </QuestionAccordion>
            ) : null}

            <StepActions onBack={() => goToStep(1)}>
              <StepButton onClick={() => void continueFromStep(2)} />
            </StepActions>
          </div>
        </StepPanel>

        <StepPanel
          isComplete={draft.services.every(
            (serviceId) => draft.products[serviceId]
          )}
          isOpen={activeStep === 3}
          number="04"
          title="Choose products"
        >
          <div className="space-y-3">
            {draft.services.map((serviceId) => (
              <ProductAccordion
                draft={draft}
                isOpen={openProductService === serviceId}
                key={serviceId}
                onIncludeBedding={() =>
                  setDraftValue("serviceDetails", {
                    ...draft.serviceDetails,
                    laundry: {
                      ...draft.serviceDetails.laundry,
                      bedding: "with-bedding",
                    },
                  })
                }
                onOpen={() => setOpenProductService(serviceId)}
                onSelect={(productId) => selectProduct(serviceId, productId)}
                products={getEligibleProductsForDraft(draft, serviceId)}
                selectedProductId={draft.products[serviceId]}
                serviceId={serviceId}
              />
            ))}
          </div>
          {Object.values(errors).map((error) => (
            <p className="mt-3 text-sm text-rose-300" key={error}>
              {error}
            </p>
          ))}
          <StepActions onBack={() => goToStep(2)}>
            <StepButton onClick={() => void continueFromStep(3)} />
          </StepActions>
        </StepPanel>

        <StepPanel
          isComplete={
            Boolean(draft.subscriptionId) ||
            !hasRecurringProduct ||
            hasRecurringProductSelected
          }
          isOpen={activeStep === 4}
          number="05"
          title="Subscription options"
        >
          <div className="space-y-4">
            {shownCombos.length > 0 ? (
              <div className="rounded-2xl border border-lime-200 bg-lime-50 p-4">
                <p className="text-sm font-bold text-slate-950">
                  You picked {formatServiceList(draft.services)}.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Bundle these services into recurring CastleCare coverage with
                  the monthly cadence shown below.
                </p>
              </div>
            ) : null}

            <button
              aria-label="No subscription today. Keep as a single appointment."
              aria-pressed={
                draft.subscriptionId === "one_time" || !draft.subscriptionId
              }
              className={cn(
                "w-full flex items-center justify-between rounded-3xl border p-5 text-left transition-all shadow-sm hover:shadow-md",
                draft.subscriptionId === "one_time" || !draft.subscriptionId
                  ? "border-lime-500 bg-lime-50/70 ring-2 ring-lime-400"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
              onClick={() => {
                setDraft((current) => ({
                  ...current,
                  paymentOption: "",
                  subscriptionId: "one_time",
                }));
                setErrors({});
              }}
              type="button"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-2xl border transition-colors",
                    draft.subscriptionId === "one_time" || !draft.subscriptionId
                      ? "border-lime-500 bg-lime-400 text-slate-950 font-bold"
                      : "border-slate-200 bg-slate-100 text-slate-400"
                  )}
                >
                  {draft.subscriptionId === "one_time" ||
                  !draft.subscriptionId ? (
                    <Check className="size-5 text-slate-950 stroke-[3]" />
                  ) : (
                    <Calendar className="size-5" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-950 text-base">
                    No subscription today
                  </p>
                  <p className="text-xs leading-5 text-slate-600 mt-0.5">
                    Keep this as a single appointment and choose recurring care
                    later.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full shrink-0 border border-slate-200/80">
                Single appointment
              </span>
            </button>

            {shownCombos.length === 0 && hasRecurringProductSelected ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="font-bold text-slate-950">
                  Recurring service plan
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Your selected item is eligible for recurring care. We will map
                  the exact billing cadence when Stripe products are synced.
                </p>
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              {shownCombos.map((combo) => {
                const comboPriceCents =
                  getComboPriceCents(draft, combo.id) ?? 0;
                const comboBadge =
                  comboPriceCents <= servicesSubtotalCents
                    ? "Best value"
                    : "Monthly plan";
                const isSelected = draft.subscriptionId === combo.id;

                return (
                  <button
                    aria-label={`${combo.name} plan - ${formatCents(comboPriceCents)} per month`}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex flex-col justify-between rounded-3xl border p-5 sm:p-6 text-left transition-all shadow-sm hover:shadow-md",
                      isSelected
                        ? "border-lime-500 bg-lime-50/70 ring-2 ring-lime-400"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                    key={combo.id}
                    onClick={() => {
                      setDraft((current) => ({
                        ...current,
                        paymentOption: "pay_full",
                        subscriptionId: combo.id,
                      }));
                      setErrors({});
                    }}
                    type="button"
                  >
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Crown className="size-4 text-lime-700 shrink-0 mt-0.5" />
                          <p className="font-extrabold text-slate-950 text-base sm:text-lg leading-tight">
                            {combo.name}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-lime-300 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-sm">
                          {comboBadge}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        {combo.description}
                      </p>
                      <div className="mt-4 space-y-2">
                        {getComboIncludedItems(combo, draft).map((item) => (
                          <div
                            className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50 p-2.5"
                            key={item.name}
                          >
                            <span className="rounded-lg bg-lime-200 px-2 py-0.5 text-xs font-black text-slate-950 shrink-0">
                              {item.name}
                            </span>
                            <span className="text-xs font-medium text-slate-600 text-right truncate ml-2">
                              {item.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs font-semibold text-slate-500">
                        Monthly billing
                      </span>
                      <span className="text-base font-black text-lime-700">
                        {formatCents(comboPriceCents)}/mo
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <StepActions onBack={() => goToStep(3)}>
            <StepButton onClick={() => void continueFromStep(4)} />
          </StepActions>
        </StepPanel>

        <StepPanel
          isComplete={Boolean(draft.paymentOption)}
          isOpen={activeStep === 5}
          number="06"
          title="Review and reserve"
        >
          <div className="mx-auto max-w-3xl">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
              <div className="border-b border-slate-100 bg-slate-950 p-5 text-white">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-5 text-lime-300" />
                  <h3 className="font-bold">Your CastleCare estimate</h3>
                </div>
                <p className="mt-2 text-sm text-white/55">
                  Confirm the services, plan, and payment choice before
                  reserving the appointment.
                </p>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        Appointment invoice
                      </p>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                        This invoice reserves your CastleCare appointment for{" "}
                        <span className="font-semibold text-slate-950">
                          {formatInvoiceDate(draft.date)}
                        </span>
                        , with arrival expected between{" "}
                        <span className="font-semibold text-slate-950">
                          {draft.timeSlot || "the selected time window"}
                        </span>
                        . Final timing may shift slightly for route, travel, or
                        weather conditions.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-left shadow-sm sm:text-right">
                      <span className="block text-xs font-semibold uppercase text-slate-500 tracking-normal">
                        Service quote
                      </span>
                      <span className="mt-1 block text-lg font-black text-slate-950">
                        {formatCents(estimatedTotalCents)}
                      </span>
                    </div>
                  </div>
                </div>
                {selectedCombo && planEstimateCents !== null ? (
                  <div className="rounded-2xl border border-lime-200 bg-lime-50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <span>
                        <span className="block font-semibold text-slate-950">
                          {selectedCombo.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {selectedCombo.frequency} · monthly service package
                        </span>
                      </span>
                      <span className="font-black text-lime-700">
                        {formatCents(planEstimateCents)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {getComboIncludedItems(selectedCombo, draft).map(
                        (item) => (
                          <span
                            className="rounded-2xl bg-white/80 p-3"
                            key={item.name}
                          >
                            <span className="block text-xs font-bold text-slate-950">
                              {item.name}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              {item.description}
                            </span>
                          </span>
                        )
                      )}
                    </div>
                    <div className="mt-3 flex justify-between text-xs font-semibold text-lime-700">
                      <span>Included each month</span>
                      <span>
                        {getComboIncludedItems(selectedCombo, draft).length}{" "}
                        service groups
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {draft.services.map((serviceId) => {
                      const product = getSelectedProduct(draft, serviceId);

                      return (
                        <div
                          className="flex justify-between gap-3 rounded-2xl bg-slate-50 p-3"
                          key={serviceId}
                        >
                          <span>
                            <span className="block font-semibold text-slate-950">
                              {product?.name ?? getServiceLabel(serviceId)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {getServiceLabel(serviceId)}
                            </span>
                          </span>
                          <span className="font-black text-slate-950">
                            {product
                              ? formatCents(
                                  getProductPriceCents(
                                    draft,
                                    serviceId,
                                    product
                                  )
                                )
                              : formatCents(0)}
                          </span>
                        </div>
                      );
                    })}
                    {quoteAddOns.map((addOn) => (
                      <div
                        className="flex justify-between gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-3"
                        key={addOn.name}
                      >
                        <span>
                          <span className="block font-semibold text-slate-950">
                            {addOn.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {addOn.description}
                          </span>
                        </span>
                        <span className="font-black text-slate-950">
                          {formatCents(addOn.priceCents)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <span>
                        <span className="block font-semibold text-slate-950">
                          Technology fee
                        </span>
                        <span className="text-xs text-slate-500">
                          Platform & dispatch fee
                        </span>
                      </span>
                      <span className="font-black text-slate-950">
                        {formatCents(TECHNOLOGY_FEE_CENTS)}
                      </span>
                    </div>
                    {draft.travel && draft.travel.feeCents > 0 ? (
                      <div className="flex justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                        <span>
                          <span className="block font-semibold text-slate-950">
                            {draft.travel.feeKind === "out_of_state"
                              ? "Travel fee (out of state)"
                              : "Travel fee (in state)"}
                          </span>
                          <span className="text-xs text-amber-800">
                            {draft.travel.feeKind === "out_of_state"
                              ? "Out of state travel"
                              : "In-state travel beyond 70 mi free radius"}
                          </span>
                        </span>
                        <span className="font-black text-slate-950">
                          {formatCents(draft.travel.feeCents)}
                        </span>
                      </div>
                    ) : null}
                  </>
                )}
                <div className="border-t border-slate-200 pt-3">
                  {hasSubscriptionSelected ? null : (
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        {isLaundryOnly ? "Due today" : "Deposit due today"}
                      </span>
                      <span className="font-semibold text-lime-700">
                        {formatCents(dueTodayCents)}
                      </span>
                    </div>
                  )}
                  {hasSubscriptionSelected ? (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Due today</span>
                      <span className="font-semibold text-lime-700">
                        {formatCents(dueTodayCents)}
                      </span>
                    </div>
                  ) : null}
                  {tipAmountCents > 0 ? (
                    <div className="mt-2 flex justify-between">
                      <span className="text-slate-500">Tip</span>
                      <span className="font-semibold text-lime-700">
                        {formatCents(tipAmountCents)}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-2 flex justify-between text-base">
                    <span className="font-semibold text-slate-950">
                      {hasSubscriptionSelected
                        ? "Monthly plan"
                        : "Estimated total"}
                    </span>
                    <span className="font-black text-slate-950">
                      {formatCents(estimatedTotalCents)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <p className="mb-1 text-sm font-semibold text-slate-950">
                    Tip (optional amount)
                  </p>
                  <p className="mb-3 text-xs text-slate-500">
                    Calculated on service subtotal (
                    {formatCents(servicesSubtotalCents)}). Added to remaining
                    balance / final invoice.
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {([0, 5, 10, 15, 20, "custom"] as const).map((option) => (
                      <button
                        className={cn(
                          "rounded-2xl border px-2 py-3 text-sm font-semibold",
                          draft.tipPercent === option
                            ? "border-lime-500 bg-lime-100 text-slate-950"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        )}
                        key={String(option)}
                        onClick={() => setDraftValue("tipPercent", option)}
                        type="button"
                      >
                        {getTipOptionLabel(option)}
                      </button>
                    ))}
                  </div>
                  {draft.tipPercent === "custom" ? (
                    <div className="mt-3 max-w-xs">
                      <RoundedField
                        label="Custom tip amount ($)"
                        onChange={(event) =>
                          setDraftValue("tipCustomPercent", event.target.value)
                        }
                        placeholder="15.00"
                        type="number"
                        value={draft.tipCustomPercent}
                      />
                    </div>
                  ) : null}
                  {tipAmountCents > 0 ? (
                    <p className="mt-2 text-sm font-semibold text-lime-700">
                      Tip: {formatCents(tipAmountCents)}
                    </p>
                  ) : null}
                  {errors.tipPercent ? (
                    <p className="mt-2 text-sm text-rose-600">
                      {errors.tipPercent}
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <p className="mb-3 text-sm font-semibold text-slate-950">
                    {hasSubscriptionSelected
                      ? "Subscription checkout"
                      : "Choose how to pay"}
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {paymentOptionsForDraft.map((option) => (
                      <button
                        className={cn(
                          "rounded-2xl border p-3 text-left transition-colors",
                          draft.paymentOption === option.id
                            ? "border-lime-500 bg-lime-100"
                            : "border-slate-200 bg-slate-50 hover:bg-white"
                        )}
                        key={option.id}
                        onClick={() =>
                          setDraftValue("paymentOption", option.id)
                        }
                        type="button"
                      >
                        <p className="text-sm font-semibold text-slate-950">
                          {option.name}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>
                  {errors.paymentOption ? (
                    <p className="mt-3 text-sm text-rose-300">
                      {errors.paymentOption}
                    </p>
                  ) : null}
                  {checkoutError ? (
                    <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                      {checkoutError}
                    </p>
                  ) : null}
                </div>
                <Button
                  className="mt-6 h-12 w-full rounded-2xl bg-lime-300 text-base font-bold text-slate-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    !draft.paymentOption ||
                    draft.tipPercent === "" ||
                    isCheckoutSubmitting
                  }
                  onClick={() => void startSecureCheckout()}
                  type="button"
                >
                  {isCheckoutSubmitting
                    ? "Starting secure checkout..."
                    : `Pay ${formatCents(dueTodayCents)} today`}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </StepPanel>
      </div>
    </div>
  );
};

export default BookingWizard;
