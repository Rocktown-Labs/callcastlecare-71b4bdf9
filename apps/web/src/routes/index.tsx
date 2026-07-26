import { createFileRoute } from "@tanstack/react-router";

import HeroSection from "@/components/home/hero";
import MarketingLayout from "@/components/home/marketing-layout";
import PropertiesSection from "@/components/home/properties";
import ServicesSection from "@/components/home/services";

const HomeComponent = () => (
  <MarketingLayout>
    <HeroSection />
    <ServicesSection />
    <PropertiesSection />
  </MarketingLayout>
);

export const Route = createFileRoute("/")({
  component: HomeComponent,
  head: () => ({
    meta: [
      {
        title: "CallCastleCare | Premium Home Services On Demand",
      },
      {
        content:
          "Book premium lawn care, laundry, and home services with CallCastleCare.",
        name: "description",
      },
    ],
  }),
});
