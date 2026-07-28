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
        title: "CastleCare | Fast & Affordable Home Services, On Demand",
      },
      {
        content:
          "Book fast, affordable lawn care, laundry pickup, and window washing with CastleCare in Central Arkansas.",
        name: "description",
      },
    ],
  }),
});
