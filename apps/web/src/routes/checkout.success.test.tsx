// @vitest-environment jsdom
import type * as TanStackRouter from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutSuccessPage } from "./checkout.success";

const searchState: { type?: string } = {};

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>(
    "@tanstack/react-router"
  );

  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: AnchorHTMLAttributes<HTMLAnchorElement> & {
      children?: ReactNode;
      to: string;
    }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => vi.fn(),
    useSearch: () => searchState,
  };
});

vi.mock("@/components/home/marketing-layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("CheckoutSuccessPage", () => {
  beforeEach(() => {
    searchState.type = undefined;
  });

  it("shows an accessible customer confirmation and clear next actions", () => {
    render(<CheckoutSuccessPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your CastleCare booking is confirmed.",
      })
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Payment received"
    );
    expect(screen.getByRole("list")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /get dashboard access/iu })
        .getAttribute("href")
    ).toBe("/claim-account");
    expect(
      screen
        .getByRole("link", { name: /open dashboard/iu })
        .getAttribute("href")
    ).toBe("/dashboard");
  });
});
