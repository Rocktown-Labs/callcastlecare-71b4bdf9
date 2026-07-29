import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SupportForm } from "./support-form";

const postSupportRequest = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    support: {
      $post: postSupportRequest,
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("SupportForm", () => {
  beforeEach(() => {
    postSupportRequest.mockReset();
  });

  it("validates phone input before sending support requests", async () => {
    render(<SupportForm sourcePath="/help" />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Taylor Customer" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "customer@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "501-CALL-CARE" },
    });
    fireEvent.change(screen.getByLabelText("How can we help?"), {
      target: { value: "I need help with a recent booking." },
    });

    expect((screen.getByLabelText("Phone") as HTMLInputElement).value).toBe(
      "501--"
    );

    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("Enter a valid phone number.")).toBeTruthy();
    expect(postSupportRequest).not.toHaveBeenCalled();
  });

  it("sends valid support requests", async () => {
    postSupportRequest.mockResolvedValue(Response.json({}, { status: 201 }));
    render(<SupportForm sourcePath="/help" />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Taylor Customer" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "customer@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "(501) 555-0123" },
    });
    fireEvent.change(screen.getByLabelText("How can we help?"), {
      target: { value: "I need help with a recent booking." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => {
      expect(postSupportRequest).toHaveBeenCalledWith({
        json: expect.objectContaining({
          email: "customer@example.com",
          message: "I need help with a recent booking.",
          name: "Taylor Customer",
          phone: "(501) 555-0123",
        }),
      });
    });
  });
});
