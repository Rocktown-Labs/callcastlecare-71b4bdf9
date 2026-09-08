export type FieldServiceType = "laundry" | "lawncare" | "window_washing";
export type FieldPhase = "after" | "before";
export type FieldAdminAction =
  | "arrived"
  | "cancel"
  | "complete"
  | "confirm"
  | "fail"
  | "start"
  | "stop";

export interface FieldPhotoSlot {
  id: string;
  label: string;
  mediaType: string;
}

export interface FieldPhotoGroup {
  hint: string;
  phase: FieldPhase;
  slots: FieldPhotoSlot[];
}

export interface FieldMediaAsset {
  mediaType: string;
  metadataJson?: Record<string, unknown> | null;
}

const propertySides: { id: string; label: string }[] = [
  { id: "property_front", label: "Front" },
  { id: "property_back", label: "Back" },
  { id: "property_left", label: "Left" },
  { id: "property_right", label: "Right" },
];

/**
 * Photo slots per service. Lawn and window work needs every side of the
 * property before and after; laundry needs a pickup photo on arrival and a
 * drop-off photo at completion (bag scan arrives later at scale).
 */
export const getFieldPhotoGroups = (
  serviceType: FieldServiceType
): FieldPhotoGroup[] => {
  if (serviceType === "laundry") {
    return [
      {
        hint: "Pickup photo on arrival",
        phase: "before",
        slots: [{ id: "pickup", label: "Pickup", mediaType: "laundry_pickup" }],
      },
      {
        hint: "Drop-off photo at completion",
        phase: "after",
        slots: [
          { id: "dropoff", label: "Drop-off", mediaType: "laundry_dropoff" },
        ],
      },
    ];
  }

  if (serviceType === "window_washing") {
    return [
      {
        hint: "Before",
        phase: "before",
        slots: [
          { id: "service", label: "Service view", mediaType: "service_before" },
        ],
      },
      {
        hint: "After",
        phase: "after",
        slots: [
          { id: "service", label: "Service view", mediaType: "service_after" },
        ],
      },
    ];
  }

  return [
    {
      hint: "Four sides before",
      phase: "before",
      slots: propertySides.map((side) => ({
        ...side,
        mediaType: "lawncare_before",
      })),
    },
    {
      hint: "Four sides after",
      phase: "after",
      slots: propertySides.map((side) => ({
        ...side,
        mediaType: "lawncare_after",
      })),
    },
  ];
};

const getSlotMedia = (
  media: { asset: FieldMediaAsset | null }[],
  slot: FieldPhotoSlot
) =>
  media.find((link) => {
    if (link.asset?.mediaType !== slot.mediaType) {
      return false;
    }
    if (slot.id === "service") {
      return true;
    }
    const metadataSlot = link.asset.metadataJson?.slot;
    return metadataSlot === slot.id;
  }) ?? null;

export interface FieldPhaseProgress {
  done: number;
  group: FieldPhotoGroup;
  total: number;
}

export const getFieldPhotoProgress = (
  serviceType: FieldServiceType,
  media: { asset: FieldMediaAsset | null }[]
): FieldPhaseProgress[] =>
  getFieldPhotoGroups(serviceType).map((group) => {
    const done = group.slots.filter(
      (slot) => getSlotMedia(media, slot) !== null
    ).length;
    return { done, group, total: group.slots.length };
  });

export type FieldStepKey =
  | "add_after_photos"
  | "add_before_photos"
  | "arrive"
  | "complete"
  | "confirm"
  | "done"
  | "start";

export interface FieldStep {
  detail: string;
  key: FieldStepKey;
  primaryAction?: FieldAdminAction;
  title: string;
}

const terminalStepTitles: Record<string, string> = {
  cancelled: "Service cancelled",
  completed: "Service complete",
  failed: "Service failed",
};

/**
 * The single next step for a service. Main buttons stay scoped to this step;
 * every other valid action remains available as a secondary button.
 */
export const getFieldStep = (input: {
  actions: FieldAdminAction[];
  media: { asset: FieldMediaAsset | null }[];
  serviceType: FieldServiceType;
  status: string;
}): FieldStep => {
  const terminalTitle = terminalStepTitles[input.status];
  if (terminalTitle) {
    return {
      detail: "No further field actions are available.",
      key: "done",
      title: terminalTitle,
    };
  }

  if (input.actions.includes("confirm")) {
    return {
      detail: "Lock the ticket in so dispatch can send it to a worker.",
      key: "confirm",
      primaryAction: "confirm",
      title: "Confirm the ticket",
    };
  }

  if (input.actions.includes("arrived")) {
    return {
      detail: "The worker is on site and the clock is running.",
      key: "arrive",
      primaryAction: "arrived",
      title: "Mark arrived",
    };
  }

  const [before, after] = getFieldPhotoProgress(input.serviceType, input.media);
  const beforeComplete =
    !before || before.done >= before.total || !input.actions.includes("start");
  const afterComplete =
    !after || after.done >= after.total || !input.actions.includes("complete");

  if (input.actions.includes("start")) {
    if (!beforeComplete && before) {
      return {
        detail: `Add ${before.total - before.done} of ${before.total} before photos, then start the service.`,
        key: "add_before_photos",
        title: "Add before photos",
      };
    }
    return {
      detail: "Before photos are in. Start the service clock.",
      key: "start",
      primaryAction: "start",
      title: "Start service",
    };
  }

  if (input.actions.includes("complete")) {
    if (!afterComplete && after) {
      return {
        detail: `Add ${after.total - after.done} of ${after.total} after photos, then complete the service.`,
        key: "add_after_photos",
        title: "Add after photos",
      };
    }
    return {
      detail: "After photos are in. Complete the service.",
      key: "complete",
      primaryAction: "complete",
      title: "Complete service",
    };
  }

  return {
    detail: "Use the actions below to move this service forward.",
    key: "done",
    title: "Awaiting next step",
  };
};
