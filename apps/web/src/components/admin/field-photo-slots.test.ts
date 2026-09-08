import { describe, expect, it } from "vitest";

import {
  getFieldPhotoGroups,
  getFieldPhotoProgress,
  getFieldStep,
} from "./field-photo-slots";

const mediaFor = (mediaType: string, slot?: string) => ({
  asset: {
    mediaType,
    ...(slot ? { metadataJson: { slot } } : {}),
  },
});

describe("getFieldPhotoGroups", () => {
  it("requires four property sides before and after for lawn care", () => {
    const groups = getFieldPhotoGroups("lawncare");

    expect(groups.map((group) => group.phase)).toEqual(["before", "after"]);
    expect(groups[0]?.slots.map((slot) => slot.id)).toEqual([
      "property_front",
      "property_back",
      "property_left",
      "property_right",
    ]);
    expect(
      groups.every((group) =>
        group.slots.every(
          (slot) => slot.mediaType === `lawncare_${group.phase}`
        )
      )
    ).toBe(true);
  });

  it("uses a single service view for window washing", () => {
    const groups = getFieldPhotoGroups("window_washing");

    expect(groups[0]?.slots).toEqual([
      { id: "service", label: "Service view", mediaType: "service_before" },
    ]);
    expect(groups[1]?.slots).toEqual([
      { id: "service", label: "Service view", mediaType: "service_after" },
    ]);
  });

  it("uses pickup and drop-off slots for laundry", () => {
    const groups = getFieldPhotoGroups("laundry");

    expect(groups[0]).toMatchObject({
      phase: "before",
      slots: [{ id: "pickup", mediaType: "laundry_pickup" }],
    });
    expect(groups[1]).toMatchObject({
      phase: "after",
      slots: [{ id: "dropoff", mediaType: "laundry_dropoff" }],
    });
  });
});

describe("getFieldPhotoProgress", () => {
  it("matches property slots by media type and metadata slot", () => {
    const progress = getFieldPhotoProgress("lawncare", [
      mediaFor("lawncare_before", "property_front"),
      mediaFor("lawncare_before", "property_back"),
      mediaFor("service_before"),
    ]);

    expect(progress[0]).toMatchObject({ done: 2, total: 4 });
    expect(progress[1]).toMatchObject({ done: 0, total: 4 });
  });

  it("ignores slots from other services", () => {
    const progress = getFieldPhotoProgress("laundry", [
      mediaFor("lawncare_before", "property_front"),
    ]);

    expect(progress[0]).toMatchObject({ done: 0, total: 1 });
  });
});

describe("getFieldStep", () => {
  it("walks confirm to arrival to start to complete", () => {
    expect(
      getFieldStep({
        actions: ["confirm", "cancel"],
        media: [],
        serviceType: "lawncare",
        status: "paid",
      })
    ).toMatchObject({ key: "confirm", primaryAction: "confirm" });

    expect(
      getFieldStep({
        actions: ["arrived", "cancel"],
        media: [],
        serviceType: "lawncare",
        status: "assigned",
      })
    ).toMatchObject({ key: "arrive", primaryAction: "arrived" });
  });

  it("asks for before photos before the start action", () => {
    const step = getFieldStep({
      actions: ["start", "cancel"],
      media: [mediaFor("lawncare_before", "property_front")],
      serviceType: "lawncare",
      status: "arrived",
    });

    expect(step.key).toBe("add_before_photos");
    expect(step.primaryAction).toBeUndefined();
    expect(step.detail).toContain("3 of 4");
  });

  it("offers start once before photos are complete", () => {
    const media = [
      "property_front",
      "property_back",
      "property_left",
      "property_right",
    ].map((slot) => mediaFor("lawncare_before", slot));

    expect(
      getFieldStep({
        actions: ["start", "cancel"],
        media,
        serviceType: "lawncare",
        status: "arrived",
      })
    ).toMatchObject({ key: "start", primaryAction: "start" });
  });

  it("asks for laundry drop-off before completion", () => {
    expect(
      getFieldStep({
        actions: ["complete", "cancel"],
        media: [mediaFor("laundry_pickup", "pickup")],
        serviceType: "laundry",
        status: "in_progress",
      })
    ).toMatchObject({ key: "add_after_photos" });
  });

  it("marks terminal services done", () => {
    expect(
      getFieldStep({
        actions: [],
        media: [],
        serviceType: "window_washing",
        status: "completed",
      }).key
    ).toBe("done");
  });
});
