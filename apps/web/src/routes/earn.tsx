import { createFileRoute } from "@tanstack/react-router";

import EarnBenefits from "@/components/earn/earn-benefits";
import EarnHero from "@/components/earn/earn-hero";
import EarnServices from "@/components/earn/earn-services";
import EarnTiers from "@/components/earn/earn-tiers";
import MarketingLayout from "@/components/home/marketing-layout";

const siteUrl = "https://callcastlecare.com";
const earnUrl = `${siteUrl}/earn`;
const earnTitle = "Earn with CastleCare | On-Demand Home Service Jobs";
const earnDescription =
  "Apply to provide lawn care, laundry pickup, and window washing on your schedule as CastleCare builds its on-demand home service provider network.";
const earnImage = `${siteUrl}/callcastlecare/media/technician-van-night.png`;

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
    links: [{ href: earnUrl, rel: "canonical" }],
    meta: [
      { title: earnTitle },
      { content: earnDescription, name: "description" },
      { content: earnTitle, property: "og:title" },
      { content: earnDescription, property: "og:description" },
      { content: earnImage, property: "og:image" },
      { content: earnUrl, property: "og:url" },
      { content: "website", property: "og:type" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: earnTitle, name: "twitter:title" },
      { content: earnDescription, name: "twitter:description" },
      { content: earnImage, name: "twitter:image" },
    ],
    scripts: [
      {
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@id": `${siteUrl}/#organization`,
              "@type": "Organization",
              logo: `${siteUrl}/callcastlecare/brand/logo-square-512.png`,
              name: "CastleCare",
              url: siteUrl,
            },
            {
              "@id": `${earnUrl}#webpage`,
              "@type": "WebPage",
              about: [
                "lawn care provider opportunities",
                "laundry pickup and wash and fold provider opportunities",
                "window washing provider opportunities",
                "on-demand home service jobs",
              ],
              description: earnDescription,
              image: earnImage,
              isPartOf: {
                "@id": `${siteUrl}/#organization`,
              },
              name: earnTitle,
              url: earnUrl,
            },
            {
              "@id": `${earnUrl}#application`,
              "@type": "ApplyAction",
              name: "Apply to earn with CastleCare",
              target: `${siteUrl}/login`,
            },
          ],
        }),
        type: "application/ld+json",
      },
    ],
  }),
});
