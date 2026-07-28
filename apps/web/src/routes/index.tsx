import { createFileRoute } from "@tanstack/react-router";

import HeroSection from "@/components/home/hero";
import MarketingLayout from "@/components/home/marketing-layout";
import ServicesSection from "@/components/home/services";

const siteUrl = "https://callcastlecare.com";
const homeTitle = "CastleCare | Fast & Affordable Home Services, On Demand";
const homeDescription =
  "Book fast, affordable lawn care, laundry pickup, and window washing with CastleCare across Arkansas.";
const homeImage = `${siteUrl}/callcastlecare/media/hero-workers-bg.jpg`;

const HomeComponent = () => (
  <MarketingLayout>
    <HeroSection />
    <ServicesSection />
  </MarketingLayout>
);

export const Route = createFileRoute("/")({
  component: HomeComponent,
  head: () => ({
    links: [{ href: siteUrl, rel: "canonical" }],
    meta: [
      { title: homeTitle },
      { content: homeDescription, name: "description" },
      { content: homeTitle, property: "og:title" },
      { content: homeDescription, property: "og:description" },
      { content: homeImage, property: "og:image" },
      { content: siteUrl, property: "og:url" },
      { content: "website", property: "og:type" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: homeTitle, name: "twitter:title" },
      { content: homeDescription, name: "twitter:description" },
      { content: homeImage, name: "twitter:image" },
    ],
    scripts: [
      {
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@id": `${siteUrl}/#organization`,
              "@type": "LocalBusiness",
              areaServed: {
                "@type": "AdministrativeArea",
                name: "Arkansas",
              },
              image: homeImage,
              logo: `${siteUrl}/callcastlecare/brand/logo-square-512.png`,
              name: "CastleCare",
              url: siteUrl,
            },
            {
              "@id": `${siteUrl}/#website`,
              "@type": "WebSite",
              description: homeDescription,
              name: "CastleCare",
              publisher: {
                "@id": `${siteUrl}/#organization`,
              },
              url: siteUrl,
            },
            {
              "@id": `${siteUrl}/#service-catalog`,
              "@type": "OfferCatalog",
              itemListElement: [
                "Lawn care",
                "Laundry pickup and wash and fold",
                "Window washing",
              ].map((name) => ({
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  areaServed: "Arkansas",
                  name,
                },
              })),
              name: "CastleCare home services",
            },
          ],
        }),
        type: "application/ld+json",
      },
    ],
  }),
});
