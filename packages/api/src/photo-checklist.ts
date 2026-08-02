export const outdoorPropertyPhotoSlots = [
  {
    id: "property_front",
    label: "Front of home",
    requiredOnFirstVisit: true,
  },
  {
    id: "property_left",
    label: "Left side",
    requiredOnFirstVisit: true,
  },
  {
    id: "property_right",
    label: "Right side",
    requiredOnFirstVisit: true,
  },
  {
    id: "property_back",
    label: "Back of home",
    requiredOnFirstVisit: true,
  },
] as const;

export const laundryPhotoSlots = [
  {
    id: "laundry_front",
    label: "Front of home",
    requiredOnFirstVisit: true,
  },
] as const;

export const getRequiredPhotoSlots = (input: {
  hasLaundry: boolean;
  hasOutdoorService: boolean;
  isFirstVisit: boolean;
}) => {
  const slots = [];

  if (input.hasOutdoorService) {
    for (const slot of outdoorPropertyPhotoSlots) {
      if (input.isFirstVisit || !slot.requiredOnFirstVisit) {
        slots.push({
          ...slot,
          kind: input.isFirstVisit ? "baseline" : "visit_snapshot",
        });
      } else {
        slots.push({
          ...slot,
          kind: "visit_snapshot",
        });
      }
    }
  }

  if (input.hasLaundry) {
    for (const slot of laundryPhotoSlots) {
      slots.push({
        ...slot,
        kind: input.isFirstVisit ? "baseline" : "visit_snapshot",
      });
    }
  }

  return slots;
};
