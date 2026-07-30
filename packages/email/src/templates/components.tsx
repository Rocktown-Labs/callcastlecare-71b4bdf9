/* @jsxImportSource react */
import {
  Body,
  Button,
  Container,
  Head,
  Heading as EmailHeading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "@react-email/components";
import type { ReactNode } from "react";

import { emailTheme } from "../theme";

const getAssetUrl = (input: {
  previewPathname: string;
  productionPathname: string;
}) => {
  const productionBaseUrl =
    process.env.EMAIL_ASSET_BASE_URL ?? emailTheme.assetBaseUrl;

  return process.env.NODE_ENV === "production"
    ? `${productionBaseUrl}${input.productionPathname}`
    : input.previewPathname;
};

const logoUrl = getAssetUrl({
  previewPathname: "/static/castlecare-250-100-trans.png",
  productionPathname: "/callcastlecare/brand/castlecare-250-100-trans.png",
});

interface EmailShellProps {
  children: ReactNode;
  preview: string;
  title: string;
}

export const EmailShell = ({ children, preview, title }: EmailShellProps) => (
  <Html dir="ltr" lang="en">
    <Tailwind
      config={{
        presets: [pixelBasedPreset],
        theme: {
          extend: {
            colors: emailTheme.colors,
          },
        },
      }}
    >
      <Head />
      <Body className="m-0 bg-canvas font-sans text-ink">
        <Preview>{preview}</Preview>
        <Section className="bg-canvas px-4 py-8" dir="ltr" lang="en">
          <Container className="mx-auto max-w-[600px] rounded border border-solid border-border bg-panel">
            <Section className="rounded-t bg-navy px-7 pt-7 pb-8">
              <Img
                alt="CastleCare"
                className="block"
                height="48"
                src={logoUrl}
                width="120"
              />
              <Text className="m-0 mt-6 text-[12px] font-bold uppercase tracking-[0.12em] text-accent">
                Fast & Affordable Home Services
              </Text>
              <EmailHeading
                as="h1"
                className="m-0 mt-3 text-[28px] font-bold leading-[1.2] text-white"
              >
                {title}
              </EmailHeading>
            </Section>
            {children}
            <Hr className="mx-7 my-0 border-border border-solid" />
            <Section className="bg-navy px-7 py-6">
              <Img
                alt="CastleCare"
                className="block"
                height="32"
                src={logoUrl}
                width="80"
              />
              <Text className="m-0 mt-4 text-[13px] leading-[1.6] text-footerText">
                CastleCare provides reliable home care from Central Arkansas,
                with service built to expand wherever customers need a better
                way to book the work. Questions? Reply to this email or write{" "}
                <Link
                  className="font-semibold text-accent"
                  href={`mailto:${emailTheme.supportEmail}`}
                >
                  {emailTheme.supportEmail}
                </Link>
                .
              </Text>
            </Section>
          </Container>
        </Section>
      </Body>
    </Tailwind>
  </Html>
);

interface PrimaryButtonProps {
  children: ReactNode;
  href: string;
}

export const PrimaryButton = ({ children, href }: PrimaryButtonProps) => (
  <Button
    className="box-border rounded-full bg-accent px-5 py-3 text-center text-[14px] font-bold text-ink no-underline"
    href={href}
  >
    {children}
  </Button>
);

interface InfoRowProps {
  label: string;
  value: ReactNode;
}

export const InfoRow = ({ label, value }: InfoRowProps) => (
  <Section className="border-none border-t border-solid border-border py-3">
    <Text className="m-0 text-[12px] font-bold uppercase tracking-[0.06em] text-muted">
      {label}
    </Text>
    <Text className="m-0 mt-1 text-[15px] leading-[1.5] text-ink">{value}</Text>
  </Section>
);
