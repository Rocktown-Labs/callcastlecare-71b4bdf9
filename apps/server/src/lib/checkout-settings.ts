import { db } from "@callcastlecare/db";
import { checkoutSettings } from "@callcastlecare/db/schema/index";

export const defaultCheckoutSettings = {
  allowCashCheckout: true,
} as const;

export interface CheckoutSettings {
  allowCashCheckout: boolean;
}

export const getCheckoutSettings = async (): Promise<CheckoutSettings> => {
  const row = await db.query.checkoutSettings.findFirst().catch(() => null);

  if (!row) {
    return {
      allowCashCheckout: defaultCheckoutSettings.allowCashCheckout,
    };
  }

  return {
    allowCashCheckout: row.allowCashCheckout,
  };
};

export const updateCheckoutSettings = async (input: {
  allowCashCheckout: boolean;
}): Promise<CheckoutSettings> => {
  await db
    .insert(checkoutSettings)
    .values({
      allowCashCheckout: input.allowCashCheckout,
      id: 1,
    })
    .onConflictDoUpdate({
      set: {
        allowCashCheckout: input.allowCashCheckout,
        updatedAt: new Date(),
      },
      target: checkoutSettings.id,
    });

  return {
    allowCashCheckout: input.allowCashCheckout,
  };
};
