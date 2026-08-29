// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { bookingTimeSlots } from "@/lib/scheduling";

import BookingWizard from "./booking-wizard";

const futureDateValue = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
};

const navigate = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useNavigate: () => navigate,
  };
});

const mockFetch = (options: { allowCashCheckout?: boolean } = {}) => {
  const { allowCashCheckout = true } = options;
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    let url: string;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else {
      ({ url } = input);
    }

    if (url.includes("/api/v1/locations/availability")) {
      return Promise.resolve(
        Response.json({
          availableSlots: [...bookingTimeSlots],
          bookedSlots: [],
          nextAvailableSlot: bookingTimeSlots[0] ?? null,
        })
      );
    }

    if (url.includes("/api/v1/checkout/settings")) {
      return Promise.resolve(
        Response.json({
          allowCashCheckout,
        })
      );
    }

    return Promise.resolve(
      Response.json({
        suggestions: [],
      })
    );
  });
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

const seedBookingProperty = (lotSizeSqft: number) => {
  window.localStorage.setItem(
    "callcastlecare.booking-draft.v1",
    JSON.stringify({
      address: "123 Main St, Little Rock, AR",
      contact: {
        email: "",
        name: "",
        phone: "",
        smsUpdates: false,
      },
      date: futureDateValue(),
      paymentOption: "",
      products: {},
      property: {
        fallbackUsed: false,
        homeSqft: 2000,
        lotSizeSqft,
      },
      serviceDetails: {
        laundry: { bedding: "", photoNames: [] },
        lawncare: { grassHeight: "", photoNames: [] },
        "window-washing": {
          cleaningScope: "",
          finalizeOnSite: false,
          photoNames: [],
          screenCount: "",
          stories: "",
          washScreens: false,
          windowEstimate: "",
        },
      },
      services: ["lawncare", "laundry", "window-washing"],
      subscriptionId: "",
      timeSlot: "10:00 AM - 12:00 PM",
    })
  );
};

const seedCompleteDraft = () => {
  window.localStorage.setItem(
    "callcastlecare.booking-draft.v1",
    JSON.stringify({
      address: "123 Main St, Little Rock, AR",
      addressId: null,
      contact: {
        email: "customer@example.com",
        name: "Taylor Customer",
        phone: "5015550123",
        smsUpdates: false,
      },
      date: futureDateValue(),
      paymentOption: "",
      products: {
        laundry: "royal-wash-basic",
        lawncare: "groundskeeper-bi-weekly",
        "window-washing": "royal-pane-detail",
      },
      property: { fallbackUsed: false, homeSqft: 2000, lotSizeSqft: 25_000 },
      serviceDetails: {
        laundry: { bedding: "none", photoNames: [], pickupMode: "outside" },
        lawncare: { grassHeight: "low", hasPets: "no", photoNames: [] },
        "window-washing": {
          cleaningScope: "both",
          finalizeOnSite: false,
          photoNames: [],
          screenCount: "",
          stories: "1",
          washScreens: false,
          windowEstimate: "20",
        },
      },
      services: ["lawncare", "laundry", "window-washing"],
      subscriptionId: "",
      timeSlot: "10:00 AM - 12:00 PM",
    })
  );
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
        initialDate={futureDateValue()}
        initialServices={["laundry"]}
        initialTimeSlot="10:00 AM - 12:00 PM"
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
    fireEvent.click(
      screen.getByRole("button", { name: /outside \(contactless\)/iu })
    );
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
          pathname: "/api/v1/checkout/quote-request",
        }),
        expect.objectContaining({
          method: "PUT",
        })
      );
    });
  });

  it("formats phone input and blocks incomplete contact numbers", async () => {
    mockFetch();

    render(
      <BookingWizard
        initialAddress="123 Main St, Little Rock, AR"
        initialDate={futureDateValue()}
        initialServices={["laundry"]}
        initialTimeSlot="10:00 AM - 12:00 PM"
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
    ).toBe("(501)");

    clickFirstContinue();

    expect(await screen.findByText("Enter a valid phone number.")).toBeTruthy();
    expect(screen.queryByText("Service details")).toBeNull();
  });

  it("formats complete phone numbers while typing", async () => {
    mockFetch();

    render(
      <BookingWizard
        initialAddress="123 Main St, Little Rock, AR"
        initialDate={futureDateValue()}
        initialServices={["laundry"]}
        initialTimeSlot="10:00 AM - 12:00 PM"
      />
    );

    clickFirstContinue();

    expect(await screen.findByText("Contact information")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("(501) 555-0123"), {
      target: { value: "5018271551" },
    });

    expect(
      (screen.getByPlaceholderText("(501) 555-0123") as HTMLInputElement).value
    ).toBe("(501)-827-1551");
  });

  it("shows the weekly plan and a bedding upgrade CTA when bedding is declined", async () => {
    mockFetch();

    render(
      <BookingWizard
        initialAddress="123 Main St, Little Rock, AR"
        initialDate={futureDateValue()}
        initialServices={["laundry"]}
        initialTimeSlot="10:00 AM - 12:00 PM"
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
    fireEvent.click(
      screen.getByRole("button", { name: /outside \(contactless\)/iu })
    );
    clickFirstContinue();

    expect(await screen.findByText("Choose products")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^weekly/iu })).toBeTruthy();
    expect(screen.getAllByText("$200.00").length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: /add bedding for \$20\.00 more/iu })
    );

    expect(
      await screen.findByRole("button", { name: /royal wash \+ bedding/iu })
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /add bedding for/iu })
    ).toBeNull();
    expect(screen.getByRole("button", { name: /^weekly/iu })).toBeTruthy();
  });

  it("offers the $50 quote deposit for an on-site visit without property data", async () => {
    mockFetch();

    render(
      <BookingWizard
        initialAddress="123 Main St, Little Rock, AR"
        initialDate={futureDateValue()}
        initialServices={["lawncare"]}
        initialTimeSlot="10:00 AM - 12:00 PM"
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
    fireEvent.click(screen.getByRole("button", { name: /no pets/iu }));
    clickFirstContinue();

    expect(await screen.findByText("Choose products")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /groundskeeper custom quote deposit/iu,
      })
    ).toBeTruthy();
    expect(screen.getAllByText("$50.00").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /groundskeeper small lot/iu })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /groundskeeper medium lot/iu })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /groundskeeper large lot/iu })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /groundskeeper bi-weekly/iu })
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /^monthly/iu })).toBeNull();
  });

  it("filters product choices and explains monthly trio service units", async () => {
    mockFetch();
    seedBookingProperty(25_000);

    render(
      <BookingWizard
        initialAddress="123 Main St, Little Rock, AR"
        initialDate={futureDateValue()}
        initialResumeDraft
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
    fireEvent.click(screen.getByRole("button", { name: /no pets/iu }));
    clickLastText("Include bedding");
    fireEvent.click(
      screen.getByRole("button", { name: /outside \(contactless\)/iu })
    );
    fireEvent.click(screen.getByRole("button", { name: /inside and out/iu }));
    fireEvent.click(screen.getByRole("button", { name: /^1$/u }));
    fireEvent.change(screen.getByPlaceholderText("Around 20"), {
      target: { value: "20" },
    });
    clickFirstContinue();

    expect(await screen.findByText("Choose products")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /groundskeeper medium lot/iu })
    );
    expect(
      screen.queryByRole("button", { name: /groundskeeper small lot/iu })
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /royal wash \+ bedding/iu })
    );
    expect(
      screen.queryByText("Wash and fold pickup for standard weekly laundry.")
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /royal pane detail/iu })
    );
    expect(
      screen.queryByRole("button", { name: /royal pane shine/iu })
    ).toBeNull();

    expect(await screen.findByText("Subscription options")).toBeTruthy();
    const trioButton = screen
      .getAllByRole("button", { name: /crown estate trio/iu })
      .find((btn) => !btn.textContent?.includes("Deluxe"));
    if (!trioButton) {
      throw new Error("Crown Estate Trio button not found.");
    }
    fireEvent.click(trioButton);
    clickFirstContinue();

    expect(await screen.findByText("Review and reserve")).toBeTruthy();
    expect(screen.getAllByText("$525.00").length).toBeGreaterThan(0);
    expect(screen.getByText("2x Wash & Fold")).toBeTruthy();
    expect(screen.getByText("1x Window Wash")).toBeTruthy();
    expect(screen.queryByText("Estimated plan savings")).toBeNull();
  });

  it("hides the cash payment option when the admin disables cash checkout", async () => {
    mockFetch({ allowCashCheckout: false });
    seedCompleteDraft();

    render(
      <BookingWizard
        initialResumeDraft
        initialServices={["lawncare", "laundry", "window-washing"]}
        initialStep="invoice"
      />
    );

    expect(await screen.findByText("Review and reserve")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /deposit now, cash later/iu })
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /deposit now, invoice later/iu })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /pay in full today/iu })
    ).toBeTruthy();
  });
});
