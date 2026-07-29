/* @jsxImportSource react */
import {
  Body,
  Button,
  Container,
  Head,
  Heading as EmailHeading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "@react-email/components";
import type { ReactNode } from "react";

import { emailTheme } from "../theme";

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
            <Section className="px-7 pt-7 pb-3">
              <Text className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">
                CastleCare
              </Text>
              <EmailHeading
                as="h1"
                className="m-0 mt-4 text-[26px] font-bold leading-[1.25] text-ink"
              >
                {title}
              </EmailHeading>
            </Section>
            {children}
            <Hr className="mx-7 my-0 border-border border-solid" />
            <Section className="px-7 py-6">
              <Text className="m-0 text-[13px] leading-[1.6] text-muted">
                CastleCare is built first for Central Arkansas. Questions? Reply
                to this email or write{" "}
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
    className="box-border rounded bg-accent px-5 py-3 text-center text-[14px] font-bold text-white no-underline"
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
