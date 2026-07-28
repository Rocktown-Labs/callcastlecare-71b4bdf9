import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BookingWizard from "./booking-wizard";

const navigate = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useNavigate: () => navigate,
  };
});

const mockFetch = () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      Response.json({
        suggestions: [],
      })
    )
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const clickFirstContinue = () => {
  const [button] = screen.getAllByRole("button", { name: /continue/iu });
  if (!button) {
    throw new Error("Continue button was not rendered.");
  }
  fireEvent.click(button);
};

const clickLastText = (text: string) => {
  const element = screen.getAllByText(text).at(-1);
  if (!element) {
    throw new Error(`${text} was not rendered.`);
  }
  fireEvent.click(element);
};

describe("BookingWizard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    navigate.mockClear();
  });

  it("starts blank on /book and validates the schedule step", async () => {
    mockFetch();

    render(<BookingWizard initialServices={[]} />);

    clickFirstContinue();

    expect(
      await screen.findByText("Select at least one service.")
    ).toBeTruthy();
    expect(screen.getByText("Enter a service address.")).toBeTruthy();
    expect(screen.getByText("Choose a date.")).toBeTruthy();
  });

  it("continues from a prefilled laundry quote and shows full payment due today", async () => {
    const fetchMock = mockFetch();

    render(
      <BookingWizard
        initialAddress="123 Main St, Little Rock, AR"
        initialDate="2026-07-28"
        initialServices={["laundry"]}
      />
    );

    clickFirstContinue();

    expect(await screen.findByText("Contact information")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Taylor Customer" },
    });
    fireEvent.change(screen.getByPlaceholderText("(501) 555-0123"), {
      target: { value: "5015550123" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "customer@example.com" },
    });
    clickFirstContinue();

    expect(await screen.findByText("Service details")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /no bedding/iu }));
    clickFirstContinue();

    expect(await screen.findByText("Choose products")).toBeTruthy();
    const [royalWashButton] = screen.getAllByRole("button", {
      name: /royal wash/iu,
    });
    if (!royalWashButton) {
      throw new Error("Royal Wash product was not rendered.");
    }
    fireEvent.click(royalWashButton);

    expect(await screen.findByText("Subscription options")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /no subscription today/iu })
    );
    clickFirstContinue();

    expect(await screen.findByText("Review and reserve")).toBeTruthy();
    expect(screen.getByText("Due today")).toBeTruthy();
    expect(screen.getAllByText("$40.00").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /deposit now, invoice later/iu })
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /pay in full today/iu })
    ).toBeTruthy();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/api/checkout/quote-request",
        }),
        expect.objectContaining({
          method: "PUT",
        })
      );
    });
  });

  it("sanitizes phone input and blocks incomplete contact numbers", async () => {
    mockFetch();

    render(
      <BookingWizard
        initialAddress="123 Main St, Little Rock, AR"
        initialDate="2026-07-28"
        initialServices={["laundry"]}
      />
    );

    clickFirstContinue();

    expect(await screen.findByText("Contact information")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Taylor Customer" },
    });
    fireEvent.change(screen.getByPlaceholderText("(501) 555-0123"), {
      target: { value: "501-CALL-CARE" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "customer@example.com" },
    });

    expect(
      (screen.getByPlaceholderText("(501) 555-0123") as HTMLInputElement).value
    ).toBe("501--");

    clickFirstContinue();

    expect(await screen.findByText("Enter a valid phone number.")).toBeTruthy();
    expect(screen.queryByText("Service details")).toBeNull();
  });

  it("keeps combo savings in sync with the selected one-time products", async () => {
    mockFetch();

    render(
      <BookingWizard
        initialAddress="123 Main St, Little Rock, AR"
        initialDate="2026-07-28"
        initialServices={["lawncare", "laundry", "window-washing"]}
      />
    );

    clickFirstContinue();
    expect(await screen.findByText("Contact information")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Taylor Customer" },
    });
    fireEvent.change(screen.getByPlaceholderText("(501) 555-0123"), {
      target: { value: "5015550123" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "customer@example.com" },
    });
    clickFirstContinue();

    expect(await screen.findByText("Service details")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /low/iu }));
    clickLastText("Include bedding");
    fireEvent.click(screen.getByRole("button", { name: /inside and out/iu }));
    fireEvent.click(screen.getByRole("button", { name: /^1$/u }));
    fireEvent.change(screen.getByPlaceholderText("Around 20"), {
      target: { value: "20" },
    });
    clickFirstContinue();

    expect(await screen.findByText("Choose products")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /groundskeeper small lot/iu })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /royal wash \+ bedding/iu })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /royal pane detail/iu })
    );

    expect(await screen.findByText("Subscription options")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /crown estate trio/iu })
    );
    clickFirstContinue();

    expect(await screen.findByText("Review and reserve")).toBeTruthy();
    expect(screen.getByText("One-time service estimate")).toBeTruthy();
    expect(screen.getAllByText("$335.00").length).toBeGreaterThan(0);
    expect(screen.getByText("-$35.00")).toBeTruthy();
  });
});
