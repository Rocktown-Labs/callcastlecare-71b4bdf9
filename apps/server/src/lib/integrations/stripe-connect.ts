import type Stripe from "stripe";

import { logger } from "../logger";
import {
  getStripeClient,
  getStripeMode,
  getStripeRequestOptions,
} from "./stripe-client";

export type ConnectAccountStatus =
  | "deauthorized"
  | "pending"
  | "ready"
  | "restricted";

export interface ConnectAccountState {
  accountId: string;
  mode: "live" | "test";
  accountApiVersion: "2026-06-24-v1" | "2026-06-24-v2";
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: unknown;
  status: ConnectAccountStatus;
  transferCapabilityStatus: string | null;
}

const getStringField = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null;

const getRecord = (value: unknown) =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const getV2AccountState = (
  account: Stripe.V2.Core.Account
): ConnectAccountState => {
  const configuration = getRecord(account.configuration);
  const recipient = getRecord(configuration?.recipient);
  const capabilities = getRecord(recipient?.capabilities);
  const stripeBalance = getRecord(capabilities?.stripe_balance);
  const transferCapability = getRecord(stripeBalance?.stripe_transfers);
  const payoutsCapability = getRecord(stripeBalance?.payouts);
  const transferCapabilityStatus = getStringField(transferCapability?.status);
  const payoutsCapabilityStatus = getStringField(payoutsCapability?.status);
  const requirements =
    account.requirements ?? account.future_requirements ?? null;
  const hasRequirements = Object.values(getRecord(requirements) ?? {}).some(
    (value) => (Array.isArray(value) ? value.length > 0 : Boolean(value))
  );
  const transferReady = transferCapabilityStatus === "active";
  const payoutsEnabled =
    payoutsCapabilityStatus === "active" ||
    (payoutsCapabilityStatus === null && transferReady);
  let status: ConnectAccountStatus = "pending";
  if (hasRequirements) {
    status = "restricted";
  }
  if (transferReady && payoutsEnabled) {
    status = "ready";
  }

  return {
    accountApiVersion: "2026-06-24-v2",
    accountId: account.id,
    chargesEnabled: false,
    mode: getStripeMode(),
    payoutsEnabled,
    requirements,
    status,
    transferCapabilityStatus,
  };
};

const getV1AccountState = (account: Stripe.Account): ConnectAccountState => {
  const transferCapabilityStatus = getStringField(
    account.capabilities?.transfers
  );
  const ready =
    account.payouts_enabled && transferCapabilityStatus === "active";
  let status: ConnectAccountStatus = "pending";
  if (account.requirements?.disabled_reason) {
    status = "restricted";
  }
  if (ready) {
    status = "ready";
  }

  return {
    accountApiVersion: "2026-06-24-v1",
    accountId: account.id,
    chargesEnabled: account.charges_enabled,
    mode: getStripeMode(),
    payoutsEnabled: account.payouts_enabled,
    requirements: account.requirements,
    status,
    transferCapabilityStatus,
  };
};

export const createConnectAccount = async (input: {
  email: string;
  name: string;
  workerId: number;
}) => {
  const stripeClient = getStripeClient();
  if (!stripeClient) {
    throw new Error("Stripe must be configured before Connect onboarding.");
  }

  try {
    const account = await stripeClient.v2.core.accounts.create(
      {
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true },
              },
            },
          },
        },
        contact_email: input.email,
        dashboard: "express",
        defaults: {
          responsibilities: {
            fees_collector: "application",
            losses_collector: "application",
          },
        },
        display_name: input.name,
        identity: {
          country: "us",
          entity_type: "individual",
        },
        include: ["configuration.recipient", "identity", "requirements"],
        metadata: {
          castlecareWorkerId: String(input.workerId),
        },
      },
      getStripeRequestOptions("connect-account", String(input.workerId))
    );
    return {
      accountApiVersion: "2026-06-24-v2" as const,
      accountId: account.id,
    };
  } catch (error) {
    logger.warn(
      { error, workerId: input.workerId },
      "stripe_connect:v2_account_create_failed_using_v1_fallback"
    );

    const account = await stripeClient.accounts.create(
      {
        business_type: "individual",
        capabilities: {
          transfers: { requested: true },
        },
        country: "US",
        email: input.email,
        metadata: {
          castlecareWorkerId: String(input.workerId),
        },
        type: "express",
      },
      getStripeRequestOptions("connect-account-v1", String(input.workerId))
    );
    return {
      accountApiVersion: "2026-06-24-v1" as const,
      accountId: account.id,
    };
  }
};

export const createConnectAccountLink = async (input: {
  accountApiVersion: "2026-06-24-v1" | "2026-06-24-v2";
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}) => {
  const stripeClient = getStripeClient();
  if (!stripeClient) {
    throw new Error("Stripe must be configured before Connect onboarding.");
  }

  if (input.accountApiVersion === "2026-06-24-v2") {
    const accountLink = await stripeClient.v2.core.accountLinks.create(
      {
        account: input.accountId,
        use_case: {
          account_onboarding: {
            configurations: ["recipient"],
            refresh_url: input.refreshUrl,
            return_url: input.returnUrl,
          },
          type: "account_onboarding",
        },
      },
      getStripeRequestOptions(
        "connect-account-link",
        input.accountId,
        crypto.randomUUID()
      )
    );
    return accountLink.url;
  }

  const accountLink = await stripeClient.accountLinks.create(
    {
      account: input.accountId,
      refresh_url: input.refreshUrl,
      return_url: input.returnUrl,
      type: "account_onboarding",
    },
    getStripeRequestOptions(
      "connect-account-link-v1",
      input.accountId,
      crypto.randomUUID()
    )
  );
  return accountLink.url;
};

export const retrieveConnectAccountState = async (
  accountId: string
): Promise<ConnectAccountState> => {
  const stripeClient = getStripeClient();
  if (!stripeClient) {
    throw new Error("Stripe must be configured before Connect status checks.");
  }

  try {
    const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
      include: ["configuration.recipient", "identity", "requirements"],
    });
    return getV2AccountState(account);
  } catch (error) {
    logger.warn(
      { accountId, error },
      "stripe_connect:v2_account_retrieve_failed_using_v1_fallback"
    );
    const account = await stripeClient.accounts.retrieve(accountId);
    return getV1AccountState(account);
  }
};

export const releaseWorkerPayout = async (input: {
  amountCents: number;
  currency?: string;
  orderId: number;
  workerStripeAccountId: string;
}) => {
  const stripeClient = getStripeClient();
  if (!stripeClient) {
    logger.info(
      {
        amountCents: input.amountCents,
        orderId: input.orderId,
        workerStripeAccountId: input.workerStripeAccountId,
      },
      "stripe_connect:transfer_skipped:no_secret_key"
    );

    return {
      providerPayoutId: null,
      success: false,
    } as const;
  }

  try {
    const transfer = await stripeClient.transfers.create(
      {
        amount: input.amountCents,
        currency: input.currency ?? "usd",
        destination: input.workerStripeAccountId,
        metadata: {
          castlecareOrderId: String(input.orderId),
        },
        transfer_group: `castlecare_order_${input.orderId}`,
      },
      getStripeRequestOptions("worker-transfer", String(input.orderId))
    );

    return {
      providerPayoutId: transfer.id,
      success: true,
    } as const;
  } catch (error) {
    logger.error(
      {
        amountCents: input.amountCents,
        error,
        orderId: input.orderId,
        workerStripeAccountId: input.workerStripeAccountId,
      },
      "stripe_connect:transfer_failed"
    );

    return {
      providerPayoutId: null,
      success: false,
    } as const;
  }
};

export const reverseWorkerTransfer = async (input: {
  amountCents?: number;
  providerPayoutId: string;
}) => {
  const stripeClient = getStripeClient();
  if (!stripeClient) {
    throw new Error("Stripe must be configured before reversing a transfer.");
  }

  const reversal = await stripeClient.transfers.createReversal(
    input.providerPayoutId,
    {
      amount: input.amountCents,
    },
    getStripeRequestOptions("transfer-reversal", input.providerPayoutId)
  );
  return reversal.id;
};
