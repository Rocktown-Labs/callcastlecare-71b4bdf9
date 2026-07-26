import { createFileRoute } from "@tanstack/react-router";

import EarnBenefits from "@/components/earn/earn-benefits";
import EarnHero from "@/components/earn/earn-hero";
import EarnServices from "@/components/earn/earn-services";
import EarnTiers from "@/components/earn/earn-tiers";
import MarketingLayout from "@/components/home/marketing-layout";

const EarnRoute = () => (
  <MarketingLayout>
    <EarnHero />
    <EarnBenefits />
    <EarnServices />
    <EarnTiers />
  </MarketingLayout>
);

export const Route = createFileRoute("/earn")({
  component: EarnRoute,
  head: () => ({
    meta: [
      {
        title: "Earn with CastleCare",
      },
      {
        content:
          "Join CastleCare as a service provider for lawn care, laundry, and home services.",
        name: "description",
      },
    ],
  }),
});
