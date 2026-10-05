import { describe, expect, it } from "vitest";

import type { DispatchWorker } from "./dispatch-helpers";
import { getWorkerAvailabilityForServices } from "./dispatch-helpers";

const worker: DispatchWorker = {
  firstName: "Arthur",
  id: 7,
  isActive: true,
  lastName: "Pendragon",
  onboardingStatus: "approved",
  servicesOffered: ["lawncare", "window-washing"],
};

describe("getWorkerAvailabilityForServices", () => {
  it("requires coverage for every service in a whole-ticket dispatch", () => {
    expect(
      getWorkerAvailabilityForServices(worker, ["lawncare", "laundry"])
    ).toEqual({ label: "Different service", ok: false });
  });

  it("allows a worker who covers every service", () => {
    expect(
      getWorkerAvailabilityForServices(worker, ["lawncare", "window_washing"])
    ).toEqual({ label: "Available", ok: true });
  });
});
