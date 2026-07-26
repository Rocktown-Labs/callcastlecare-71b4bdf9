import { Droplets, Home, Ruler, Shirt, Sparkles, Sprout } from "lucide-react";
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

export const centralArkansasArea = "Central Arkansas";

export const serviceCatalog: ServiceCatalogItem[] = [
  {
    accentClassName: "border-lime-400/30 bg-lime-400/10 text-lime-300",
    badge: "Lawn Maintenance",
    ctaText: "Explore lawncare",
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
      "Book lawncare in Central Arkansas with CallCastleCare. Mowing, edging, cleanup, and recurring lawn maintenance plans.",
    shortName: "Lawn care",
    startingPrice: 75,
    subscriptionInfo: "Bi-weekly care plans available",
    title: "Groundskeeper Lawncare",
  },
  {
    accentClassName: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    badge: "Laundry & Linens",
    ctaText: "Explore laundry",
    description:
      "Wash, dry, fold, pickup, and delivery so the weekly laundry pile stops eating your day.",
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
      "Schedule laundry pickup and delivery in Central Arkansas with CallCastleCare. Wash and fold, bedding, and recurring laundry plans.",
    shortName: "Laundry",
    startingPrice: 35,
    subscriptionInfo: "Weekly laundry care plans available",
    title: "Royal Wash Laundry",
  },
  {
    accentClassName: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    badge: "Spotless Window Valet",
    ctaText: "Explore window washing",
    description:
      "Crystal-clear glass care with estimates based on pane count, stories, screens, and finish level.",
    detailHeading: "Clear panes, clean tracks, brighter rooms.",
    features: [
      "Exterior-only or inside-and-out washing",
      "Pane count estimate during booking",
      "Multi-story ladder and safety handling",
      "Screen cleaning and photo verification",
    ],
    icon: Sparkles,
    id: "window-washing",
    image: "/callcastlecare/media/premium-home-services-poster.png",
    included: [
      "Streak-free exterior glass wash",
      "Inside-and-out upgrade options",
      "Screen cleaning add-on",
      "Story and pane-count verification before checkout",
    ],
    priceUnit: "pane",
    seoDescription:
      "Book window washing in Central Arkansas with CallCastleCare. Exterior panes, inside-and-out cleaning, screens, and recurring glass care.",
    shortName: "Window washing",
    startingPrice: 10,
    subscriptionInfo: "Monthly and bi-annual plans available",
    title: "Royal Pane Window Washing",
  },
];

export const serviceOptions = serviceCatalog.map(({ icon, id, shortName }) => ({
  icon,
  id,
  name: shortName,
}));

export const comboSubscriptions = [
  {
    description: "Bi-weekly lawn care plus bi-weekly Royal Wash laundry.",
    discountLabel: "20% off total",
    frequency: "Every 2 weeks",
    id: "bi_weekly_royal_duo",
    name: "Bi-Weekly Royal Duo",
    requiredServices: ["lawncare", "laundry"],
  },
  {
    description:
      "Monthly lawn maintenance plus monthly Royal Pane window detail.",
    discountLabel: "20% off total",
    frequency: "Monthly",
    id: "monthly_castle_care",
    name: "Monthly Castle Care",
    requiredServices: ["lawncare", "window-washing"],
  },
  {
    description:
      "Bi-weekly lawn care, weekly laundry, and monthly Royal Pane detailing.",
    discountLabel: "30% off total",
    frequency: "Multi-frequency care plan",
    id: "crown_estate_trio",
    name: "Crown Estate Trio",
    requiredServices: ["lawncare", "laundry", "window-washing"],
  },
] as const;

export const serviceQuestionIcons = {
  bedding: Home,
  grass: Ruler,
  windows: Droplets,
} as const;

export const getService = (serviceId: string) =>
  serviceCatalog.find((service) => service.id === serviceId);
