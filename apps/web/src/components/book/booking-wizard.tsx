import { Button } from "@callcastlecare/ui/components/button";
import { Input } from "@callcastlecare/ui/components/input";
import { Label } from "@callcastlecare/ui/components/label";
import { cn } from "@callcastlecare/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Crown,
  Mail,
  Phone,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { bookingTimeSlots } from "@/lib/scheduling";
import {
  comboSubscriptions,
  serviceCatalog,
  serviceIdSchema,
  serviceQuestionIcons,
} from "@/lib/service-catalog";
import type { ServiceId } from "@/lib/service-catalog";

import { RadarAddressInput } from "../home/radar-address-input";
import type { RadarAddressSuggestion } from "../home/use-radar-address-autocomplete";

const storageKey = "callcastlecare.booking-draft.v1";

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

const productsByService = {
  laundry: [
    {
      description: "Wash and fold pickup for standard weekly laundry.",
      id: "royal_wash_basic",
      name: "Royal Wash Basic",
      priceCents: 4000,
      recurring: false,
    },
    {
      description:
        "Eco wash, stain treatment, bedding support, folded and hung.",
      id: "royal_wash_deluxe",
      name: "Royal Wash Deluxe",
      priceCents: 6000,
      recurring: false,
    },
    {
      description:
        "Weekly pickup, wash, fold, and delivery for busy households.",
      id: "weekly_wash_fold",
      name: "Weekly Wash & Fold",
      priceCents: 20_000,
      recurring: true,
    },
  ],
  lawncare: [
    {
      description: "A one-time mow, edge, trim, and cleanup.",
      id: "standard_lawn",
      name: "Standard Grounds Visit",
      priceCents: 7500,
      recurring: false,
    },
    {
      description: "Recurring mowing and cleanup for steady curb appeal.",
      id: "bi_weekly_lawn",
      name: "Bi-Weekly Lawn Care",
      priceCents: 12_500,
      recurring: true,
    },
    {
      description: "Extra time for tall grass, heavy trimming, and reset work.",
      id: "tall_grass_reset",
      name: "Tall Grass Reset",
      priceCents: 12_000,
      recurring: false,
    },
  ],
  "window-washing": [
    {
      description: "Exterior panes washed and finished streak-free.",
      id: "exterior_panes",
      name: "Exterior Pane Shine",
      priceCents: 10_000,
      recurring: false,
    },
    {
      description: "Inside, outside, tracks, and brighter rooms.",
      id: "royal_panes_detail",
      name: "Royal Panes Detail",
      priceCents: 18_000,
      recurring: true,
    },
    {
      description:
        "A seasonal reset for glass, screens, and first impressions.",
      id: "bi_annual_glass_care",
      name: "Bi-Annual Glass Care",
      priceCents: 15_000,
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

const insideGlassFeePerPaneCents = 500;
const screenWashFeePerScreenCents = 250;
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
  date: z.string().min(1, "Choose a date."),
  services: z.array(serviceIdSchema).min(1, "Select at least one service."),
  timeSlot: z.string().min(1, "Choose a time."),
});

const contactSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  name: z.string().min(2, "Enter your name."),
  phone: z.string().min(10, "Enter a phone number."),
  smsUpdates: z.boolean(),
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
  contact: {
    email: string;
    name: string;
    phone: string;
    smsUpdates: boolean;
  };
  date: string;
  paymentOption: PaymentOptionId | "";
  products: Partial<Record<ServiceId, string>>;
  serviceDetails: {
    laundry: {
      bedding: "none" | "with-bedding" | "";
      photoNames: string[];
    };
    lawncare: {
      grassHeight: "low" | "medium" | "tall" | "";
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
}

interface BookingWizardProps {
  initialAddress?: string;
  initialDate?: string;
  initialServices: ServiceId[];
  initialStep?: WizardStepKey;
  initialTimeSlot?: string;
}

const emptyDraft = ({
  initialAddress = "",
  initialDate = "",
  initialServices,
  initialTimeSlot = bookingTimeSlots[2],
}: BookingWizardProps): BookingDraft => ({
  address: initialAddress,
  contact: {
    email: "",
    name: "",
    phone: "",
    smsUpdates: true,
  },
  date: initialDate,
  paymentOption: "",
  products: {},
  serviceDetails: {
    laundry: { bedding: "", photoNames: [] },
    lawncare: { grassHeight: "", photoNames: [] },
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
  services: initialServices.length > 0 ? initialServices : ["lawncare"],
  subscriptionId: "",
  timeSlot: initialTimeSlot,
});

const formatCents = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);

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

const selectedProductTotal = (draft: BookingDraft) => {
  let total = 0;

  for (const serviceId of draft.services) {
    const selectedProductId = draft.products[serviceId];
    const product = productsByService[serviceId].find(
      ({ id }) => id === selectedProductId
    );
    total += product?.priceCents ?? 0;
  }

  return total;
};

const parsePositiveCount = (value: string) => {
  const count = Math.trunc(Number(value));
  if (!Number.isFinite(count) || count < 1) {
    return 0;
  }

  return count;
};

const getWindowAddOns = (draft: BookingDraft) => {
  if (!draft.services.includes("window-washing")) {
    return [];
  }

  const windowDetails = draft.serviceDetails["window-washing"];
  if (windowDetails.finalizeOnSite) {
    return [];
  }

  const paneCount = parsePositiveCount(windowDetails.windowEstimate);
  const screenCount = parsePositiveCount(windowDetails.screenCount);
  const addOns: {
    description: string;
    name: string;
    priceCents: number;
  }[] = [];

  if (windowDetails.cleaningScope === "both" && paneCount > 0) {
    addOns.push({
      description: `${paneCount} panes x ${formatCents(
        insideGlassFeePerPaneCents
      )}`,
      name: "Inside glass upgrade",
      priceCents: paneCount * insideGlassFeePerPaneCents,
    });
  }

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

const getServiceLabel = (serviceId: ServiceId) =>
  serviceCatalog.find(({ id }) => id === serviceId)?.shortName ?? serviceId;

const stepKeyToIndex = (step?: WizardStepKey): WizardStep =>
  step ? (stepKeys.indexOf(step) as WizardStep) : 0;

const addServiceDetailErrors = (
  draft: BookingDraft,
  nextErrors: Record<string, string>
) => {
  if (
    draft.services.includes("lawncare") &&
    !draft.serviceDetails.lawncare.grassHeight
  ) {
    nextErrors.grassHeight = "Choose a grass height.";
  }
  if (
    draft.services.includes("laundry") &&
    !draft.serviceDetails.laundry.bedding
  ) {
    nextErrors.bedding = "Choose a bedding option.";
  }
  if (!draft.services.includes("window-washing")) {
    return;
  }

  const windowDetails = draft.serviceDetails["window-washing"];

  if (!windowDetails.cleaningScope) {
    nextErrors.cleaningScope = "Choose exterior only or inside and out.";
  }
  if (!windowDetails.stories) {
    nextErrors.stories = "Choose the number of stories.";
  }
  if (!(windowDetails.finalizeOnSite || windowDetails.windowEstimate)) {
    nextErrors.windowEstimate = "Estimate the number of windows.";
  }
  if (
    windowDetails.washScreens &&
    !windowDetails.finalizeOnSite &&
    parsePositiveCount(windowDetails.screenCount) === 0
  ) {
    nextErrors.screenCount = "Enter the number of screens.";
  }
};

const buildInitialDraft = (
  props: BookingWizardProps,
  storedDraft: BookingDraft | null
) => {
  const initialDraft = emptyDraft(props);

  return {
    ...initialDraft,
    ...storedDraft,
    address: props.initialAddress || storedDraft?.address || "",
    date: props.initialDate || storedDraft?.date || "",
    serviceDetails: {
      ...initialDraft.serviceDetails,
      ...storedDraft?.serviceDetails,
      laundry: {
        ...initialDraft.serviceDetails.laundry,
        ...storedDraft?.serviceDetails?.laundry,
      },
      lawncare: {
        ...initialDraft.serviceDetails.lawncare,
        ...storedDraft?.serviceDetails?.lawncare,
      },
      "window-washing": {
        ...initialDraft.serviceDetails["window-washing"],
        ...storedDraft?.serviceDetails?.["window-washing"],
      },
    },
    services:
      props.initialServices.length > 0
        ? props.initialServices
        : storedDraft?.services || ["lawncare"],
    timeSlot:
      props.initialTimeSlot || storedDraft?.timeSlot || bookingTimeSlots[2],
  };
};

const getStepErrors = (draft: BookingDraft, step: WizardStep) => {
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

  if (step === 5 && !draft.paymentOption) {
    nextErrors.paymentOption = "Choose a checkout option.";
  }

  return nextErrors;
};

const wizardSteps = [
  "Schedule",
  "Contact",
  "Details",
  "Products",
  "Plans",
  "Invoice",
] as const;

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
  <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
    {wizardSteps.map((label, index) => (
      <button
        className={cn(
          "rounded-2xl border px-3 py-2 text-left text-xs font-bold transition-colors",
          activeStep === index
            ? "border-slate-950 bg-slate-950 text-white"
            : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
        )}
        key={label}
        onClick={() => onStepSelect(index as WizardStep)}
        type="button"
      >
        <span className="block text-[10px] uppercase tracking-widest opacity-60">
          Step {index + 1}
        </span>
        {label}
      </button>
    ))}
  </div>
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

const RoundedField = ({
  error,
  icon: Icon,
  label,
  ...props
}: React.ComponentProps<"input"> & {
  error?: string;
  icon?: LucideIcon;
  label: string;
}) => (
  <div className="space-y-2">
    <Label className="text-slate-600">{label}</Label>
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
    {error ? <p className="text-sm text-rose-300">{error}</p> : null}
  </div>
);

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

const ServicePhotoUpload = ({
  count,
  onFiles,
}: {
  count: number;
  onFiles: (fileNames: string[]) => void;
}) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 transition-colors hover:border-cyan-500">
    <span className="flex items-center gap-3">
      <Upload className="size-4" />
      Add photos for faster quote review
    </span>
    <span className="text-xs text-slate-400">{count} files</span>
    <input
      className="sr-only"
      multiple
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        const files = [...(event.target.files ?? [])];
        onFiles(files.map(({ name }) => name));
      }}
      type="file"
    />
  </label>
);

const ProductAccordion = ({
  isOpen,
  onOpen,
  onSelect,
  products,
  selectedProductId,
  serviceId,
}: {
  isOpen: boolean;
  onOpen: () => void;
  onSelect: (productId: string) => void;
  products: readonly ProductOption[];
  selectedProductId?: string;
  serviceId: ServiceId;
}) => {
  const selectedProduct = products.find(({ id }) => id === selectedProductId);

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
          {products.map((product) => (
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{product.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {product.description}
                  </p>
                </div>
                <span className="shrink-0 font-black text-lime-700">
                  {formatCents(product.priceCents)}
                </span>
              </div>
              {product.recurring ? (
                <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                  <Sparkles className="size-3" />
                  Subscription eligible
                </p>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

// eslint-disable-next-line complexity
const BookingWizard = (props: BookingWizardProps) => {
  const navigate = useNavigate({ from: "/book" });
  const storedDraft = parseStoredDraft();
  const [draft, setDraft] = useState<BookingDraft>(() =>
    buildInitialDraft(props, storedDraft)
  );
  const [activeStep, setActiveStep] = useState<WizardStep>(() =>
    stepKeyToIndex(props.initialStep)
  );
  const [openProductService, setOpenProductService] = useState<ServiceId>(
    draft.services[0] ?? "lawncare"
  );
  const [openDetailService, setOpenDetailService] = useState<ServiceId>(
    draft.services[0] ?? "lawncare"
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAddressValidated, setIsAddressValidated] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft]);

  const setDraftValue = <Key extends keyof BookingDraft>(
    key: Key,
    value: BookingDraft[Key]
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors({});
  };

  const goToStep = (step: WizardStep) => {
    setActiveStep(step);
    navigate({
      replace: true,
      search: (current) => ({
        ...current,
        step: stepKeys[step],
      }),
    });
  };

  const clearDraft = () => {
    const nextDraft = emptyDraft(props);
    window.localStorage.removeItem(storageKey);
    setDraft(nextDraft);
    setErrors({});
    setIsAddressValidated(false);
    setOpenDetailService(nextDraft.services[0]);
    setOpenProductService(nextDraft.services[0]);
    goToStep(0);
  };

  const toggleService = (serviceId: ServiceId) => {
    setDraft((current) => {
      const exists = current.services.includes(serviceId);
      const services = exists
        ? current.services.filter((id) => id !== serviceId)
        : [...current.services, serviceId];
      const nextServices = services.length > 0 ? services : current.services;

      if (!nextServices.includes(openDetailService)) {
        setOpenDetailService(nextServices[0]);
      }
      if (!nextServices.includes(openProductService)) {
        setOpenProductService(nextServices[0]);
      }

      return {
        ...current,
        services: nextServices,
      };
    });
  };

  const validateStep = (step: WizardStep) => {
    const nextErrors = getStepErrors(draft, step);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const continueFromStep = (step: WizardStep) => {
    if (!validateStep(step)) {
      return;
    }

    goToStep(Math.min(step + 1, 5) as WizardStep);
  };

  const selectProduct = (serviceId: ServiceId, productId: string) => {
    setDraft((current) => ({
      ...current,
      products: { ...current.products, [serviceId]: productId },
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

  const selectedCombos = comboSubscriptions.filter((combo) =>
    combo.requiredServices.every((serviceId) =>
      draft.services.includes(serviceId)
    )
  );
  const shownCombos =
    draft.services.length === 3
      ? selectedCombos.filter((combo) => combo.requiredServices.length === 3)
      : selectedCombos.filter(
          (combo) => combo.requiredServices.length === draft.services.length
        );
  const windowAddOns = getWindowAddOns(draft);
  let addOnTotalCents = 0;
  for (const addOn of windowAddOns) {
    addOnTotalCents += addOn.priceCents;
  }
  const subtotalCents = selectedProductTotal(draft) + addOnTotalCents;
  const depositCents = 5000;
  const hasRecurringProduct = draft.services.some((serviceId) =>
    productsByService[serviceId].some(
      (product) => product.id === draft.products[serviceId] && product.recurring
    )
  );

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white p-4 text-slate-950 shadow-2xl shadow-slate-950/40 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Request saved on this device
        </p>
        <button
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-950"
          onClick={clearDraft}
          type="button"
        >
          Clear booking
        </button>
      </div>
      <StepProgress activeStep={activeStep} onStepSelect={goToStep} />
      <StepPanel
        isComplete={basicsSchema.safeParse(draft).success}
        isOpen={activeStep === 0}
        number="01"
        title="Services and schedule"
      >
        <div className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {serviceCatalog.map((service) => {
              const Icon = service.icon;
              const selected = draft.services.includes(service.id);

              return (
                <button
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    selected
                      ? "border-lime-500 bg-lime-100 text-slate-950"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                  )}
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  type="button"
                >
                  <Icon className="mb-3 size-5" />
                  <span className="text-sm font-semibold">
                    {service.shortName}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.services ? (
            <p className="text-sm text-rose-300">{errors.services}</p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
            <div className="space-y-2">
              <Label className="text-slate-600">Service address</Label>
              <RadarAddressInput
                className="border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus-visible:border-lime-500"
                error={errors.address}
                isValidated={isAddressValidated}
                onChange={(address) => setDraftValue("address", address)}
                onSelectSuggestion={(suggestion: RadarAddressSuggestion) => {
                  setDraftValue("address", suggestion.label);
                  setIsAddressValidated(true);
                }}
                value={draft.address}
              />
              {errors.address ? (
                <p className="text-sm text-rose-300">{errors.address}</p>
              ) : null}
            </div>

            <RoundedField
              error={errors.date}
              icon={Calendar}
              label="Date"
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setDraftValue("date", event.target.value)}
              type="date"
              value={draft.date}
            />

            <div className="space-y-2">
              <Label className="text-slate-600">Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <select
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-950 outline-none focus:border-lime-500"
                  onChange={(event) =>
                    setDraftValue("timeSlot", event.target.value)
                  }
                  value={draft.timeSlot}
                >
                  {bookingTimeSlots.map((timeSlot) => (
                    <option key={timeSlot}>{timeSlot}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <StepButton onClick={() => continueFromStep(0)} />
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
            value={draft.contact.name}
          />
          <RoundedField
            error={errors["contact.phone"]}
            icon={Phone}
            label="Phone"
            onChange={(event) =>
              setDraftValue("contact", {
                ...draft.contact,
                phone: event.target.value,
              })
            }
            placeholder="(501) 555-0123"
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
            Send me SMS booking and provider updates.
          </label>
        </div>
        <StepButton onClick={() => continueFromStep(1)} />
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
              isComplete={Boolean(draft.serviceDetails.lawncare.grassHeight)}
              isOpen={openDetailService === "lawncare"}
              onOpen={() => setOpenDetailService("lawncare")}
              title="How tall is the grass?"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {grassHeights.map((height, index) => (
                  <button
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      draft.serviceDetails.lawncare.grassHeight === height.id
                        ? "border-lime-500 bg-lime-100 text-slate-950"
                        : "border-slate-200 bg-white text-slate-600"
                    )}
                    key={height.id}
                    onClick={() => {
                      setDraftValue("serviceDetails", {
                        ...draft.serviceDetails,
                        lawncare: { grassHeight: height.id },
                      });
                      completeServiceDetails("lawncare");
                    }}
                    type="button"
                  >
                    <GrassSvg level={index + 1} />
                    <p className="mt-3 font-semibold">{height.name}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {height.description}
                    </p>
                  </button>
                ))}
              </div>
              {errors.grassHeight ? (
                <p className="text-sm text-rose-300">{errors.grassHeight}</p>
              ) : null}
              <div className="mt-4">
                <ServicePhotoUpload
                  count={draft.serviceDetails.lawncare.photoNames.length}
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
              isComplete={Boolean(draft.serviceDetails.laundry.bedding)}
              isOpen={openDetailService === "laundry"}
              onOpen={() => setOpenDetailService("laundry")}
              title="Will this include bedding?"
            >
              <div className="grid gap-3 sm:grid-cols-2">
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
                      "rounded-2xl border p-4 text-left transition-colors",
                      draft.serviceDetails.laundry.bedding === id
                        ? "border-sky-500 bg-sky-50 text-slate-950"
                        : "border-slate-200 bg-white text-slate-600"
                    )}
                    key={id}
                    onClick={() => {
                      setDraftValue("serviceDetails", {
                        ...draft.serviceDetails,
                        laundry: {
                          bedding: id as "none" | "with-bedding",
                        },
                      });
                      completeServiceDetails("laundry");
                    }}
                    type="button"
                  >
                    <p className="font-semibold">{name}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {description}
                    </p>
                  </button>
                ))}
              </div>
              {errors.bedding ? (
                <p className="text-sm text-rose-300">{errors.bedding}</p>
              ) : null}
              <div className="mt-4">
                <ServicePhotoUpload
                  count={draft.serviceDetails.laundry.photoNames.length}
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
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
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
                          "rounded-2xl border p-4 text-left transition-colors",
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
                        <p className="font-semibold">{name}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
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
                          windowEstimate: event.target.value,
                        },
                      })
                    }
                    placeholder="Around 20"
                    type="number"
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
                            screenCount: event.target.value,
                          },
                        })
                      }
                      placeholder="12"
                      type="number"
                      value={draft.serviceDetails["window-washing"].screenCount}
                    />
                  ) : null}
                </div>

                <ServicePhotoUpload
                  count={
                    draft.serviceDetails["window-washing"].photoNames.length
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
                <Button
                  className="h-11 w-full rounded-2xl bg-slate-950 font-bold text-white hover:bg-slate-800"
                  onClick={() => completeServiceDetails("window-washing")}
                  type="button"
                >
                  Save Window Details
                  <Check className="size-4" />
                </Button>
              </div>
            </QuestionAccordion>
          ) : null}

          <StepButton onClick={() => continueFromStep(2)} />
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
              isOpen={openProductService === serviceId}
              key={serviceId}
              onOpen={() => setOpenProductService(serviceId)}
              onSelect={(productId) => selectProduct(serviceId, productId)}
              products={productsByService[serviceId]}
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
        <StepButton onClick={() => continueFromStep(3)} />
      </StepPanel>

      <StepPanel
        isComplete={Boolean(draft.subscriptionId) || !hasRecurringProduct}
        isOpen={activeStep === 4}
        number="05"
        title="Subscription options"
      >
        <div className="grid gap-3">
          <button
            className={cn(
              "rounded-2xl border p-4 text-left transition-colors",
              draft.subscriptionId === "one_time"
                ? "border-lime-500 bg-lime-100"
                : "border-slate-200 bg-slate-50 hover:bg-white"
            )}
            onClick={() => setDraftValue("subscriptionId", "one_time")}
            type="button"
          >
            <p className="font-semibold text-slate-950">
              No subscription today
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Keep this as a single appointment and choose recurring care later.
            </p>
          </button>

          {shownCombos.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">
                Recurring service plan
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Your selected item is eligible for recurring care. We will map
                the exact billing cadence when Stripe products are synced.
              </p>
            </div>
          ) : null}

          {shownCombos.map((combo) => (
            <button
              className={cn(
                "rounded-2xl border p-4 text-left transition-colors",
                draft.subscriptionId === combo.id
                  ? "border-lime-500 bg-lime-100"
                  : "border-slate-200 bg-slate-50 hover:bg-white"
              )}
              key={combo.id}
              onClick={() => setDraftValue("subscriptionId", combo.id)}
              type="button"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Crown className="size-4 text-lime-700" />
                <p className="font-semibold text-slate-950">{combo.name}</p>
                <span className="rounded-full bg-lime-300 px-2 py-1 text-[10px] font-black uppercase text-slate-950">
                  {combo.discountLabel}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {combo.description}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                {combo.frequency}
              </p>
            </button>
          ))}
        </div>
        <StepButton onClick={() => continueFromStep(4)} />
      </StepPanel>

      <StepPanel
        isComplete={Boolean(draft.paymentOption)}
        isOpen={activeStep === 5}
        number="06"
        title="Checkout preview"
      >
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
            <div className="border-b border-slate-100 bg-slate-950 p-5 text-white">
              <div className="flex items-center gap-2">
                <CreditCard className="size-5 text-lime-300" />
                <h3 className="font-bold">Invoice preview</h3>
              </div>
              <p className="mt-2 text-sm text-white/55">
                Review the service estimate before Stripe checkout.
              </p>
            </div>
            <div className="space-y-3 p-5 text-sm">
              {draft.services.map((serviceId) => {
                const product = productsByService[serviceId].find(
                  ({ id }) => id === draft.products[serviceId]
                );

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
                      {formatCents(product?.priceCents ?? 0)}
                    </span>
                  </div>
                );
              })}
              {windowAddOns.map((addOn) => (
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
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Deposit due today</span>
                  <span className="font-semibold text-lime-700">
                    {formatCents(depositCents)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-base">
                  <span className="font-semibold text-slate-950">
                    Estimated total
                  </span>
                  <span className="font-black text-slate-950">
                    {formatCents(subtotalCents)}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="mb-3 text-sm font-semibold text-slate-950">
                  Choose how to pay
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {paymentOptions.map((option) => (
                    <button
                      className={cn(
                        "rounded-2xl border p-3 text-left transition-colors",
                        draft.paymentOption === option.id
                          ? "border-lime-500 bg-lime-100"
                          : "border-slate-200 bg-slate-50 hover:bg-white"
                      )}
                      key={option.id}
                      onClick={() => setDraftValue("paymentOption", option.id)}
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
              </div>
              <Button
                className="mt-6 h-12 w-full rounded-2xl bg-lime-300 text-base font-bold text-slate-950 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!draft.paymentOption}
                onClick={() => validateStep(5)}
                type="button"
              >
                Continue to Stripe
                <ArrowRight className="size-4" />
              </Button>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Product sync, deposit collection, and account finalization will
                wire into this UI after the schema and API are ready.
              </p>
            </div>
          </div>
        </div>
      </StepPanel>
    </div>
  );
};

export default BookingWizard;
