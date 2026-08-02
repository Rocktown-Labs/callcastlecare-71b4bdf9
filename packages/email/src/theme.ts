export const emailTheme = {
  assetBaseUrl: "https://www.callcastlecare.com",
  colors: {
    accent: "#b7ff3c",
    accentDark: "#7ccf00",
    border: "#dfe7ef",
    canvas: "#f4f7fb",
    footerText: "#cbd5e1",
    ink: "#070d1d",
    muted: "#526278",
    navy: "#070d1d",
    navySoft: "#111827",
    panel: "#ffffff",
    soft: "#f4f8ef",
    warning: "#92400e",
  },
  from: "CastleCare <noreply@info.callcastlecare.com>",
  replyTo: "care@callcastlecare.com",
  siteUrl: "https://www.callcastlecare.com",
  supportEmail: "care@callcastlecare.com",
} as const;

export const formatCents = (amountCents: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(amountCents / 100);

export const castleCareUrl = (pathname: string) =>
  new URL(pathname, emailTheme.siteUrl).toString();
