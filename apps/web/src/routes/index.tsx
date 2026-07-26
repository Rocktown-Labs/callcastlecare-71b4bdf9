import { createFileRoute } from "@tanstack/react-router";

import HeroSection from "@/components/home/hero";
import MarketingLayout from "@/components/home/marketing-layout";
import ServicesSection from "@/components/home/services";

const HomeComponent = () => (
  <MarketingLayout>
    <HeroSection />
    <ServicesSection />
  </MarketingLayout>
);

export const Route = createFileRoute("/")({
  component: HomeComponent,
  head: () => ({
    meta: [
      {
        title: "CastleCare | Premium Home Services On Demand",
      },
      {
        content:
          "Book premium lawn care, laundry, and window washing with CastleCare in Central Arkansas.",
        name: "description",
      },
    ],
  }),
});
