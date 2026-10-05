# CastleCare Stripe operations

## Money flow

CastleCare is a marketplace. Customer payments are collected on the platform account. Service providers are paid only after a job is completed, so provider settlement uses separate charges and transfers rather than destination charges. The default provider payout is 60% of the service amount plus the customer tip. Stripe fees, refunds, disputes, and negative balances remain platform responsibilities unless the platform policy changes.

The $50 Express provider verification charge is a platform-only Checkout payment. It does not transfer funds to a provider. After screening approval, the provider can start Express Connect onboarding from the Provider Hub.

## Environment

Set these server variables in the deployment secret manager:

- `STRIPE_SECRET_KEY` — prefer an appropriately restricted `rk_test_` or `rk_live_` key.
- `STRIPE_PUBLISHABLE_KEY` — public key for any future browser Stripe UI; never put a secret key in `VITE_` variables.
- `STRIPE_WEBHOOK_BASE_URL` — the canonical public origin, such as `https://callcastlecare.com`.
- `STRIPE_BILLING_WEBHOOK_SECRET` — signing secret for recurring subscription events.
- `STRIPE_COMMERCE_WEBHOOK_SECRET` — signing secret for one-time checkout, payment, refund, and dispute events.
- `STRIPE_CONNECT_WEBHOOK_SECRET` — signing secret for connected-account events.
- `PROVIDER_PAYOUT_BPS` — defaults to `6000` (60%).
- `PLATFORM_FEE_BPS` — reserved for a future explicit platform fee policy.

`STRIPE_WEBHOOK_SECRET` and `STRIPE_WEBHOOK_PUBLIC_URL` remain supported for legacy commerce deployments, but new setups should use the three endpoint secrets above.

Test and live keys, prices, customers, subscriptions, Connect accounts, and webhook secrets are separate Stripe resources. Do not mix them.

## Catalog sync

1. Set the desired test or live `STRIPE_SECRET_KEY` in Vercel.
2. Apply the database migrations through the latest migration.
3. Sign in as the configured admin and open `/admin/catalog`.
4. Review local product prices and intervals.
5. Click **Sync**.
6. If new webhook endpoints were created, copy the one-time secrets from the warning panel into the matching Vercel environment variables and redeploy.
7. Click **Sync** again to confirm the endpoints show as enabled.

Sync is safe to repeat. Products are identified by stable metadata and prices by stable lookup keys plus currency, interval, and amount. Stripe prices are not mutated when an amount changes; a new price is created and selected.

## Webhooks

The sync operation manages these fixed URLs:

- `/api/v1/webhooks/stripe/billing`
- `/api/v1/webhooks/stripe/commerce`
- `/api/v1/webhooks/stripe/connect`

The handlers verify the raw request body with the endpoint-specific signing secret before parsing it. Event IDs are stored uniquely and failed events can be retried safely.

Billing events update local service subscriptions. `invoice.paid` creates the service orders for the paid period. `invoice.payment_failed` marks the local subscription `past_due`. One-time checkout fulfillment remains driven by Checkout webhook events, not the success-page redirect.

## Provider onboarding and payout

After the $50 Express Checkout completes, the provider is placed in the holding state for email verification and screening review. An admin approves the provider in `/admin/staff`; the Provider Hub then exposes the Connect onboarding link. Connect status is refreshed from Stripe and transfers are blocked until the recipient account is payout-ready.

The platform records a payout per order. Completion is idempotent, records the 60% base earnings plus tip, and creates a transfer only for a ready connected account. Orders whose provider is not yet payout-ready remain pending for operations to retry after onboarding.

## Testing

Use Stripe test mode first. Recommended checks:

```bash
stripe listen --forward-to http://localhost:3001/api/v1/webhooks/stripe/commerce
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.paid
```

Use the Stripe Dashboard or CLI to verify the Checkout Session mode, recurring Price ID, local checkout ID metadata, subscription ID, webhook delivery, and Connect transfer. Never fulfill from a browser success redirect alone.
