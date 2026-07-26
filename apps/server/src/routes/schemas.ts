import { z } from "zod";

export const timingTypeSchema = z.enum(["asap", "scheduled"]);

export const checkoutPreviewItemSchema = z.object({
  homeQuoteId: z.number().int().positive().optional(),
  itemKind: z.enum(["lawncare", "laundry", "home_preorder"]),
  planId: z.string().min(1).optional(),
  scheduledEndAt: z.string().datetime().optional(),
  scheduledStartAt: z.string().datetime().optional(),
  timingType: timingTypeSchema.optional(),
  tipAmountCents: z.number().int().nonnegative().optional(),
});

export const checkoutPreviewRequestSchema = z
  .object({
    address: z.string().min(5).optional(),
    addressId: z.number().int().positive().optional(),
    items: z.array(checkoutPreviewItemSchema).min(1),
  })
  .superRefine((value, ctx) => {
    if (!value.address && !value.addressId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either address or addressId is required",
        path: ["address"],
      });
    }
  });

export const checkoutConfirmRequestSchema = checkoutPreviewRequestSchema.extend(
  {
    paymentMethodId: z.string().min(1).optional(),
  }
);

export const checkoutDraftRequestSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
});

export const updateCustomerProfileRequestSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(7).optional().nullable(),
});

export const upsertAddressRequestSchema = z
  .object({
    address: z.string().trim().min(5).optional(),
    city: z.string().trim().min(1).optional(),
    country: z.string().trim().min(2).optional(),
    formattedAddress: z.string().trim().min(5).optional(),
    instructions: z.string().trim().max(500).optional().nullable(),
    isDefault: z.boolean().optional(),
    label: z.string().trim().min(1).max(64).optional(),
    latitude: z.number().finite().optional().nullable(),
    longitude: z.number().finite().optional().nullable(),
    state: z.string().trim().min(2).optional(),
    street: z.string().trim().min(1).optional(),
    zip: z.string().trim().min(3).optional(),
  })
  .superRefine((value, ctx) => {
    const hasStructuredAddress = !!(
      value.street &&
      value.city &&
      value.state &&
      value.zip
    );

    if (!value.address && !hasStructuredAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide address text or full structured address",
        path: ["address"],
      });
    }
  });

export const updateAddressRequestSchema = z.object({
  instructions: z.string().trim().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
  label: z.string().trim().min(1).max(64).optional(),
});

export const driverLocationHeartbeatSchema = z.object({
  accuracyMeters: z.number().finite().optional().nullable(),
  capturedAt: z.string().datetime().optional(),
  heading: z.number().finite().optional().nullable(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  orderId: z.number().int().positive().optional(),
  speedMps: z.number().finite().optional().nullable(),
});

export const homeQuoteRequestSchema = z.object({
  address: z.string().min(5),
});

export const mediaUploadUrlRequestSchema = z.object({
  contentType: z.string().min(1),
  legId: z.number().int().positive().optional(),
  mediaType: z.enum([
    "lawncare_before",
    "lawncare_after",
    "laundry_pickup",
    "laundry_scan",
    "laundry_folded",
    "laundry_dropoff",
  ]),
  orderId: z.number().int().positive().optional(),
});

export const mediaAttachRequestSchema = z.object({
  legId: z.number().int().positive().optional(),
  mediaType: z.enum([
    "lawncare_before",
    "lawncare_after",
    "laundry_pickup",
    "laundry_scan",
    "laundry_folded",
    "laundry_dropoff",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  orderId: z.number().int().positive().optional(),
  requiredForTransition: z.string().optional(),
  storagePath: z.string().min(1),
});
