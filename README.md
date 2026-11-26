# Carlala platform

Peer-to-peer car rental for Bucharest: owners list their cars, renters search by sector and time, request a booking, the owner accepts, the renter pays, and both review each other afterwards. Romanian and English, prices in RON.

The presentation site (carlala.eu) is a separate static site on cyberfolks. This app is meant to run at **app.carlala.eu**.

## What's in this first version

| Area | What works |
|---|---|
| Accounts | Sign up, log in, log out with email and password (sessions in a signed cookie). |
| Owners | List a car (make, model, year, seats, gearbox, fuel, sector, neighbourhood, description, hourly and daily price, up to 6 photos), edit it, pause it. |
| Renters | Search by sector, pick-up and return time, gearbox and fuel. Cars already booked for those hours are hidden; each result shows the total price. |
| Bookings | Request with a message, owner accepts or declines, renter pays, owner marks the trip finished. Unanswered or unpaid requests expire at pick-up time; paid trips finish automatically at return time. Overlapping bookings are refused. |
| Payments | Stripe Checkout in RON when Stripe keys are set; a clearly labelled payment simulator when they aren't. |
| Reviews | After a finished trip, renter and owner each leave a 1 to 5 star review. Owner ratings show on the car page. |
| Admin | Totals, all bookings, hide a car, suspend a user. |
| Language | Romanian or English, chosen in the header (remembered per user); defaults to the browser language. |

### Pricing rule
Every full 24 hours costs the daily price; leftover hours cost the hourly price, capped at one more day. Carlala keeps **25 %** of each rental from the owner's side (`PLATFORM_FEE_RATE` in `src/lib/pricing.ts`; both rules confirmed in November 2026). All times are Bucharest time; money is stored in bani.

### Not built yet
ID and driving-licence checks, damage reports with photos, owner payouts (Stripe Connect), in-app messages, email notifications, refunds, Terms of use. The privacy policy on carlala.eu must be updated before real users sign up here, because accounts, phone numbers and payments are new kinds of data.

## Run it locally

Needs Node 20+ and PostgreSQL.

```bash
npm install
```

```bash
cp .env.example .env
```

Edit `.env` so `DATABASE_URL` and `DIRECT_URL` point to your database, then:

```bash
npx prisma migrate dev
```

```bash
npm run db:seed
```

```bash
npm run dev
```

The seed prints an admin login (`hello@carlala.eu` with a random password) and creates demo owners and cars. Demo accounts use `@demo.carlala.eu` addresses with the password `carlala-demo`.

Tests:

```bash
npm test
```

## Put it online (Vercel + Neon)

1. **Database on Neon.** In the Neon Console, open the project and click **Connect**. Copy the string with **Connection pooling on** (for `DATABASE_URL`) and the one with it **off** (for `DIRECT_URL`). Use the EU (Frankfurt) region.
2. **App on Vercel.** **Add New → Project**, import `Carlala1985/carlala-app` from GitHub, and add these environment variables before the first deploy:
   - `DATABASE_URL`, `DIRECT_URL` from Neon
   - `SESSION_SECRET`: a random string of at least 32 characters
   - `APP_URL`: optional. If unset, the app uses the production domain Vercel provides (`app.carlala.eu` once connected, else `carlala-app.vercel.app`).
   - `BREVO_API_KEY`: Brevo **API** key (starts with `xkeysib-`, not the SMTP key) for booking emails and password resets. Without it, emails are only written to the logs.
   - `ADMIN_EMAILS`: `hello@carlala.eu` (whoever signs up or logs in with this address becomes admin)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: optional at first (see below)
3. **Photos.** In the Vercel project, **Storage → Create → Blob**, then connect it to the project. Vercel adds `BLOB_READ_WRITE_TOKEN` itself. Redeploy afterwards.
4. **Deploy.** Each deployment creates or updates the database tables automatically (`prisma migrate deploy` runs in the build). The app runs in Frankfurt (`vercel.json`).
5. **First admin.** Open the site and sign up with `hello@carlala.eu`; that account is the admin.
6. **Domain.** In Vercel, add the domain `app.carlala.eu`. Then in cPanel, open **Zone Editor**, choose **carlala.eu** and add a **CNAME** record: name `app`, value `cname.vercel-dns.com`. Do not change the existing `carlala.eu` A record.

To build locally without touching a database, run `npm run build:local`.

## Stripe (test mode first)

1. Create an account at stripe.com and stay in **Test mode**.
2. Copy the secret key (`sk_test_…`) into `STRIPE_SECRET_KEY` on Vercel.
3. In **Developers → Webhooks**, add the endpoint `https://app.carlala.eu/api/stripe/webhook` with the events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy its signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.
4. Redeploy. The "Pay" button now opens Stripe Checkout; use the test card `4242 4242 4242 4242`.

Before taking real money: activate the Stripe account for GUFFROY SRL, set up owner payouts (Stripe Connect), and add refunds for cancelled paid trips.

## Project map

- `prisma/schema.prisma`: users, cars, photos, bookings, reviews
- `src/lib/`: pricing, Bucharest time handling, booking rules, payments, sessions, translations (`i18n/en.ts`, `i18n/ro.ts`)
- `src/app/`: pages (`cars`, `account/*`, `admin`, `pay`) and server actions (`actions/*`)
- `tests/`: pricing, availability and time zone tests
