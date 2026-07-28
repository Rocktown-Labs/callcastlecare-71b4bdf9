export const emailTheme = {
  colors: {
    accent: "#166534",
    accentDark: "#14532d",
    border: "#d9e2dc",
    canvas: "#f6f7f3",
    ink: "#17211b",
    muted: "#5f6f66",
    panel: "#ffffff",
    soft: "#eef5ef",
    warning: "#92400e",
  },
  from: "CastleCare <noreply@info.callcastlecare.com>",
  replyTo: "care@callcastlecare.com",
  supportEmail: "care@callcastlecare.com",
} as const;

export const formatCents = (amountCents: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(amountCents / 100);
