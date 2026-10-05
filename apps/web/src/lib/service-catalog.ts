import { Grid2x2, Home, Ruler, Shirt, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { z } from "zod";

export const serviceIdSchema = z.enum([
  "lawncare",
  "laundry",
  "window-washing",
]);

export type ServiceId = z.infer<typeof serviceIdSchema>;

export interface ServiceCatalogItem {
  accentClassName: string;
  badge: string;
  ctaText: string;
  description: string;
  detailHeading: string;
  features: string[];
  icon: LucideIcon;
  id: ServiceId;
  image: string;
  included: string[];
  priceUnit: string;
  seoDescription: string;
  shortName: string;
  startingPrice: number;
  subscriptionInfo: string;
  title: string;
}

export interface ServicePageFaq {
  answer: string;
  question: string;
}

export interface ServicePageStep {
  description: string;
  title: string;
}

export interface ServicePageContent {
  aiAnswer: string;
  bookingPrefill: string;
  cityExpansionNote: string;
  faq: ServicePageFaq[];
  finalCta: string;
  finalCtaBody: string;
  headline: string;
  heroAlt: string;
  intro: string;
  localProof: string[];
  primaryKeyword: string;
  process: ServicePageStep[];
  proofLine: string;
  quoteDetails: string[];
  secondaryKeyword: string;
  serviceArea: string;
}

export const centralArkansasArea = "Arkansas";

export const serviceCatalog: ServiceCatalogItem[] = [
  {
    accentClassName: "border-lime-400/30 bg-lime-400/10 text-lime-300",
    badge: "Groundskeeper",
    ctaText: "Explore Lawncare",
    description:
      "Eco-minded mowing, edge trimming, and cleanup for standard lots, larger yards, and commercial grounds.",
    detailHeading: "Grounds that look looked after, all season.",
    features: [
      "Precision mowing and clean edging",
      "Clipping, debris, and walkway cleanup",
      "Lot-size aware pricing for recurring plans",
      "Bi-weekly and monthly maintenance options",
    ],
    icon: Sprout,
    id: "lawncare",
    image: "/callcastlecare/media/lawn-care-rider-night.png",
    included: [
      "Mowing pattern matched to yard conditions",
      "String trim around fences and beds",
      "Blow-off for walkways, drives, and patios",
      "Photo updates after the job is wrapped",
    ],
    priceUnit: "service",
    seoDescription:
      "Book Lawn Care in Arkansas with CastleCare. Mowing, edging, cleanup, and recurring lawn maintenance plans.",
    shortName: "Lawn Care",
    startingPrice: 75,
    subscriptionInfo: "Bi-weekly care plans available",
    title: "Lawn Care",
  },
  {
    accentClassName: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    badge: "Royal Wash",
    ctaText: "Explore Laundry",
    description:
      "Same-day wash and fold, pickup, and delivery so the weekly laundry pile stops eating your day.",
    detailHeading: "Fresh laundry, folded neatly, back at your door.",
    features: [
      "Wash, dry, and crisp fold garment care",
      "Pickup and delivery scheduling",
      "Premium detergents and stain treatment",
      "Bedding, linens, and weekly plans",
    ],
    icon: Shirt,
    id: "laundry",
    image: "/callcastlecare/media/laundry-pickup-van.png",
    included: [
      "Sorted wash and fold service",
      "Doorstep pickup and drop-off",
      "Optional bedding and linen handling",
      "Delivery status updates by email or SMS",
    ],
    priceUnit: "load",
    seoDescription:
      "Schedule laundry pickup and delivery in Arkansas with CastleCare. Wash and fold, bedding, and recurring laundry plans.",
    shortName: "Laundry",
    startingPrice: 40,
    subscriptionInfo: "Weekly laundry care plans available",
    title: "Laundry",
  },
  {
    accentClassName: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    badge: "Royal Pane",
    ctaText: "Explore Window Washing",
    description:
      "Crystal-clear glass care with estimates based on pane count, stories, screens, and finish level.",
    detailHeading: "Clear panes, clean tracks, brighter rooms.",
    features: [
      "Exterior-only or inside-and-out washing",
      "Pane count estimate during booking",
      "Multi-story ladder and safety handling",
      "Screen cleaning and photo verification",
    ],
    icon: Grid2x2,
    id: "window-washing",
    image: "/callcastlecare/media/window-washing-hero.png",
    included: [
      "Streak-free exterior glass wash",
      "Inside-and-out upgrade options",
      "Screen cleaning add-on",
      "Story and pane-count verification before checkout",
    ],
    priceUnit: "pane",
    seoDescription:
      "Book window washing in Arkansas with CastleCare. Exterior panes, inside-and-out cleaning, screens, and recurring glass care.",
    shortName: "Window Washing",
    startingPrice: 5,
    subscriptionInfo: "Monthly and bi-annual plans available",
    title: "Window Washing",
  },
];

export const serviceOptions = serviceCatalog.map(({ icon, id, shortName }) => ({
  icon,
  id,
  name: shortName,
}));

const serviceOrder = serviceCatalog.map(({ id }) => id);

export const sortServiceIds = (serviceIds: readonly ServiceId[]) =>
  serviceOrder.filter((serviceId) => serviceIds.includes(serviceId));

export const servicePageContent: Record<ServiceId, ServicePageContent> = {
  laundry: {
    aiAnswer:
      "CastleCare provides same-day wash and fold laundry pickup and delivery in Arkansas. Customers choose laundry during booking, add bedding if needed, pick a 2-hour window, and pay for laundry-only orders up front before pickup.",
    bookingPrefill:
      "The booking flow opens with Royal Wash selected, so you can go straight into address, pickup window, bedding, and contact details.",
    cityExpansionNote:
      "Royal Wash is built first for Arkansas, with the same booking workflow ready to expand as pickup coverage grows.",
    faq: [
      {
        answer:
          "Laundry-only bookings are designed for same-day wash and fold when schedule capacity is available. The booking flow asks for your pickup window and confirms the next available 2-hour slot.",
        question: "Can CastleCare do same-day wash and fold?",
      },
      {
        answer:
          "Yes. Select the bedding option during booking so sheets, blankets, and linens are included in the quote.",
        question: "Can I include bedding with my laundry pickup?",
      },
      {
        answer:
          "Laundry-only bookings collect full payment up front. If you bundle laundry with lawn care or window washing, the checkout step will show the available payment choices for that combination.",
        question: "How does payment work for laundry?",
      },
      {
        answer:
          "CastleCare starts in Arkansas. The app is designed to add more pickup zones as operations scale city by city.",
        question: "Where is laundry pickup available?",
      },
    ],
    finalCta: "Get my laundry pickup window",
    finalCtaBody:
      "Start a Royal Wash quote, choose your pickup time, and tell us whether bedding is coming with the load.",
    headline: "Fast and Affordable Same-Day Wash and Fold",
    heroAlt: "CastleCare laundry pickup van ready for same-day wash and fold",
    intro:
      "Laundry should not own your evening. Royal Wash gives you pickup, wash, fold, and delivery in one guided booking flow, with bedding options and clear status updates after you reserve.",
    localProof: [
      "Same-day pickup flow",
      "Laundry-only checkout up front",
      "Bedding and linen option",
    ],
    primaryKeyword: "same-day wash and fold laundry",
    process: [
      {
        description:
          "Choose Royal Wash, enter your address, and pick a 2-hour pickup window.",
        title: "Reserve pickup",
      },
      {
        description:
          "Tell us whether the order includes bedding, linens, or garment-only wash and fold.",
        title: "Set the details",
      },
      {
        description:
          "Pay online for laundry-only orders, then get updates as pickup and delivery move forward.",
        title: "Track the handoff",
      },
    ],
    proofLine:
      "Best for busy renters, homeowners, parents, and anyone who wants the laundry pile gone without calling around.",
    quoteDetails: [
      "Pickup and delivery scheduling",
      "Wash, dry, and folded garment care",
      "Bedding and linen handling",
      "SMS consent and delivery updates",
    ],
    secondaryKeyword: "laundry pickup and delivery",
    serviceArea: "Laundry pickup and delivery in Arkansas",
  },
  lawncare: {
    aiAnswer:
      "CastleCare offers lawn care booking in Arkansas for mowing, edging, trimming, cleanup, and recurring yard maintenance. Customers choose lawn care, enter the property address, select grass height, reserve a 2-hour appointment window, and place a $50 deposit for non-laundry service.",
    bookingPrefill:
      "The booking flow opens with Groundskeeper Lawncare selected, then asks for address, preferred window, grass height, photos, and product choice.",
    cityExpansionNote:
      "Groundskeeper Lawncare launches in Arkansas and is structured so new service areas can be added as provider coverage expands.",
    faq: [
      {
        answer:
          "A standard lawn care booking can include mowing, edging, trimming, walkway blow-off, cleanup, and post-service photo updates.",
        question: "What is included in CastleCare lawn care?",
      },
      {
        answer:
          "The booking flow asks whether grass is low, medium, or tall. Tall grass can change the quote because it usually takes more time and cleanup.",
        question: "Do you handle tall grass?",
      },
      {
        answer:
          "CastleCare supports one-time lawn care and recurring care options. Recurring plans are shown during booking when the selected product qualifies.",
        question: "Can I book recurring lawn maintenance?",
      },
      {
        answer:
          "Lawn Care reservations use a $50 deposit to hold the appointment window, with the remaining balance handled through the checkout choice shown in booking.",
        question: "How much is due today for lawn care?",
      },
    ],
    finalCta: "Get my lawn care quote",
    finalCtaBody:
      "Start with your address and grass height. CastleCare will guide the quote before checkout.",
    headline: "Fast and Affordable Lawn Care",
    heroAlt: "CastleCare lawn care crew mowing and edging an Arkansas yard",
    intro:
      "Groundskeeper Lawncare is built for yards that need reliable mowing, clean edges, and a booking flow that does not make you chase a quote by phone.",
    localProof: [
      "2-hour service windows",
      "$50 appointment deposit",
      "Recurring care options",
    ],
    primaryKeyword: "lawn care in Arkansas",
    process: [
      {
        description:
          "Enter your service address and choose a 2-hour appointment window between morning and evening availability.",
        title: "Pick the window",
      },
      {
        description:
          "Tell us the grass height and add photos if the yard needs quote review.",
        title: "Describe the yard",
      },
      {
        description:
          "Reserve with a $50 deposit, then get the balance confirmed around service completion.",
        title: "Reserve the job",
      },
    ],
    proofLine:
      "Best for standard lots, larger yards, renters moving out, and homeowners who want repeatable lawn care without quote-chasing.",
    quoteDetails: [
      "Mowing matched to yard condition",
      "Edging and trimming around beds and fences",
      "Walkway and driveway blow-off",
      "Photo updates after service",
    ],
    secondaryKeyword: "affordable lawn mowing",
    serviceArea: "Lawn mowing and yard cleanup in Arkansas",
  },
  "window-washing": {
    aiAnswer:
      "CastleCare provides window washing in Arkansas for exterior panes, inside-and-out glass, screens, and recurring window care. Customers choose window washing, enter stories and rough pane count, optionally add photos, and reserve a 2-hour appointment window with a $50 deposit.",
    bookingPrefill:
      "The booking flow opens with Royal Pane selected, then asks for stories, pane estimate, screen cleaning, photos, and checkout preference.",
    cityExpansionNote:
      "Royal Pane starts with Arkansas coverage and can expand as trained glass-care capacity is added in new cities.",
    faq: [
      {
        answer:
          "Royal Pane can support exterior-only or inside-and-out window washing. You choose the scope during booking before the quote is finalized.",
        question: "Do you clean inside and outside windows?",
      },
      {
        answer:
          "Yes. The window washing flow asks for 1, 2, or 3 stories so the job can be reviewed with the right access and safety expectations.",
        question: "Can CastleCare handle multi-story windows?",
      },
      {
        answer:
          "You can add screen cleaning during booking. If you do, the flow asks for a screen count so the estimate is more accurate.",
        question: "Do you wash window screens?",
      },
      {
        answer:
          "Window Washing reservations use a $50 deposit to hold your appointment window. You can choose deposit plus invoice later, pay in full today, or deposit plus cash later.",
        question: "How does window washing checkout work?",
      },
    ],
    finalCta: "Get my window washing quote",
    finalCtaBody:
      "Tell us the pane count, stories, and whether screens need attention. CastleCare will guide the quote from there.",
    headline: "Fast and Affordable Window Washing",
    heroAlt: "CastleCare technician washing bright residential windows",
    intro:
      "Royal Pane gives you clear glass without the back-and-forth. Choose exterior-only or inside-and-out service, add screens if needed, and reserve a window that fits your day.",
    localProof: [
      "Exterior or inside-and-out",
      "Pane and story estimate",
      "$50 appointment deposit",
    ],
    primaryKeyword: "window washing in Arkansas",
    process: [
      {
        description:
          "Choose Royal Pane and reserve a 2-hour appointment window that works for your home.",
        title: "Choose a time",
      },
      {
        description:
          "Add stories, rough pane count, screen count, and photos when a visual quote check would help.",
        title: "Count the glass",
      },
      {
        description:
          "Hold the appointment with a $50 deposit and pick the payment path that fits the job.",
        title: "Confirm checkout",
      },
    ],
    proofLine:
      "Best for brighter rooms, pre-listing cleanup, seasonal refreshes, and recurring glass care.",
    quoteDetails: [
      "Exterior-only or inside-and-out washing",
      "Story and pane-count quote review",
      "Screen cleaning add-on",
      "Photo-assisted estimate support",
    ],
    secondaryKeyword: "residential window cleaning",
    serviceArea: "Residential window washing in Arkansas",
  },
};

export const comboSubscriptions: {
  description: string;
  discountLabel: string;
  frequency: string;
  id: string;
  name: string;
  requiredServices: ServiceId[];
}[] = [
  {
    description: "2 Lawn Care visits plus 2 wash and fold pickups each month.",
    discountLabel: "From $250/month",
    frequency: "Monthly billing",
    id: "bi_weekly_royal_duo",
    name: "Bi-Weekly Royal Duo",
    requiredServices: ["lawncare", "laundry"],
  },
  {
    description:
      "4 wash and fold pickups plus 1 exterior Window Washing visit each month.",
    discountLabel: "$280/month",
    frequency: "Monthly billing",
    id: "royal_linen_panes_duo",
    name: "Royal Linen & Panes Duo",
    requiredServices: ["laundry", "window-washing"],
  },
  {
    description:
      "1 Lawn Care visit plus 1 exterior Window Washing visit each month.",
    discountLabel: "From $200/month",
    frequency: "Monthly billing",
    id: "monthly_castle_care",
    name: "Monthly CastleCare",
    requiredServices: ["lawncare", "window-washing"],
  },
  {
    description: "Bi-weekly mow, wash and fold, and 1 monthly window washing.",
    discountLabel: "From $300/month",
    frequency: "Monthly billing",
    id: "crown_estate_trio",
    name: "Crown Estate Trio",
    requiredServices: ["lawncare", "laundry", "window-washing"],
  },
  {
    description:
      "Crown Estate Trio plus inside-and-out windows and bedding on laundry visits.",
    discountLabel: "From $360/month",
    frequency: "Monthly billing",
    id: "crown_estate_trio_deluxe",
    name: "Crown Estate Trio Deluxe",
    requiredServices: ["lawncare", "laundry", "window-washing"],
  },
];

export const serviceQuestionIcons = {
  bedding: Home,
  grass: Ruler,
  windows: Grid2x2,
} as const;

export const getService = (serviceId: string) =>
  serviceCatalog.find((service) => service.id === serviceId);
