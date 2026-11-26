# Stripe integration plan: Carlala

Business: peer-to-peer car rental in Bucharest (carlala.eu / app.carlala.eu), operated by GUFFROY SRL (Romania).
Renters pay Carlala; car owners (private individuals) receive the rental price minus Carlala's 25 % fee.
Products: **Payments**, **Connect**, **Tax**.

This plan follows Stripe's own best-practices guidance (Stripe agent plugin, API version `2026-11-18.endive`).

## 1. Shape of the integration

| Decision | Choice | Why |
|---|---|---|
| Who is merchant of record | **Carlala (platform)** | Renters book and pay on Carlala; owners don't run their own shops. |
| Charge pattern | **Separate charges and transfers** | Carlala must **hold** the money until the trip has happened (hold-and-release). Destination charges would pay the owner the moment the renter pays, before the car is even handed over. |
| Platform fee | **Transfer math**: transfer `ownerEarnings` (75 %), keep the rest | `application_fee_amount` must not be used with separate charges and transfers. |
| Connected accounts | **Accounts v2** (`POST /v2/core/accounts`), `configuration.recipient` with `stripe_balance.stripe_transfers` | Owners only need to *receive* money. No `card_payments`, no legacy `type: express`. |
| Account dashboard | `dashboard: "express"` | Light, Stripe-hosted page where owners see payouts and fix their details. |
| Responsibilities | `fees_collector: "application"`, `losses_collector: "application"` | Required for separate charges and transfers; Carlala carries refunds and disputes. |
| Owner onboarding | **Stripe-hosted onboarding via Account Links v2**, later the embedded `account_onboarding` + `notification_banner` components | Stripe collects ID, address and IBAN; Carlala never handles them. |
| Renter payment | **Checkout Sessions** (Stripe-hosted page), RON | Already in the app. No `payment_method_types` (dynamic payment methods). |
| Payment confirmation | **Webhooks** `checkout.session.completed` + `checkout.session.async_payment_succeeded` (gated on `payment_status`), `checkout.session.async_payment_failed` | Already in the app; extend for Connect events. The return page is only a convenience. |
| API keys | **Restricted API key** (`rk_…`), one per environment | Least privilege. |
| Environments | A **Stripe sandbox** for development, live mode only at launch | Sandboxes isolate test data and settings. |

## 2. Money flow per booking

1. Owner accepts → renter pays the **total** through Checkout. The PaymentIntent carries `transfer_group = booking id`.
2. Booking becomes **PAID** (webhook). Money sits in Carlala's Stripe balance.
3. Trip ends → booking **COMPLETED** → Carlala creates a **Transfer** of `ownerEarnings` to the owner's connected account, with the same `transfer_group` and `source_transaction` = the charge (so it never transfers money that hasn't settled).
4. Stripe pays the owner out to their IBAN on their payout schedule.
5. Cancelled before pick-up → **Refund** to the renter (no transfer was made). Rules for partial refunds go in the Terms of use.
6. Dispute (chargeback) after a transfer → Carlala reverses the transfer if appropriate (Carlala carries the loss otherwise).

## 3. What changes in the app

- **Owners**: "Get paid" step in My cars → creates the v2 account and sends the owner to Stripe onboarding. A car can only be published (or accepted for booking) once the owner's `stripe_transfers` capability is **active**; the app re-checks it before each transfer and listens to v2 account events.
- **Bookings**: store `stripePaymentIntentId`, `stripeChargeId`, `stripeTransferId`, `refundedAt`.
- **Payouts job**: when a booking is completed (manual "finished" or automatic at return time), create the transfer; retry safely with an idempotency key = booking id.
- **Cancellation of a paid trip**: refund through Stripe instead of the current "contact support" note.
- **Admin**: show payout status per booking and owners whose account needs attention.
- **SDK**: upgrade `stripe` (Node) to the current major version; always use a client instance; pin the API version; tag Checkout Sessions with `integration_identifier`.

## 4. Tax: decide before enabling anything

Stripe Tax only collects tax where the business has an **active registration** recorded in Stripe; with none, `automatic_tax` silently collects nothing.

Questions for GUFFROY SRL's accountant before turning Stripe Tax on:

- **Who owes VAT on what?** The owners are mostly private individuals (usually not VAT-registered). Carlala's own service is its 25 % commission. Is GUFFROY SRL registered for VAT in Romania (*plătitor de TVA*), and is VAT due on the whole rental or only on Carlala's commission?
- **Is the total shown to renters tax-inclusive?** (Consumer prices in Romania are normally shown including VAT.)
- **DAC7**: EU platforms that facilitate the **rental of any mode of transport** must collect sellers' details (name, address, tax ID, IBAN) and report owners' income to ANAF every year. Stripe Connect onboarding collects most of this; confirm what else is needed.

Once answered: set the head office address in Stripe Tax settings, record the Romanian registration, choose the product tax code from Stripe's tax code list, set tax behaviour (inclusive/exclusive), then enable `automatic_tax` on Checkout with `liability: { type: "self" }`, and verify with a test calculation that `taxability_reason` is not `not_collecting`.

## 5. Build order

Status (26 Nov 2026): steps 1-4 built and tested in the sandbox (webhook, transfer with `source_transaction`, idempotent retries, admin refund). Step 5 waits for the accountant; step 6 at launch.


1. Sandbox + restricted key; upgrade SDK; harden the existing Checkout + webhook (already working in simulator mode).
2. Owner onboarding (Accounts v2 + Account Links) and capability checks.
3. Transfers on trip completion, refunds on cancellation, Connect webhooks.
4. Admin payout view; end-to-end test in the sandbox with test cards and test IBANs.
5. Tax, after the accountant's answers.
6. Go-live checklist: live restricted key, live webhook endpoint, Terms of use, insurance partner in place.
