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
Every full 24 hours costs the daily price; leftover hours cost the hourly price, capped at one more day. Carlala keeps **25 %** of each rental from the owner's side (`PLATFORM_FEE_RATE` in `src/lib/pricing.ts`, a placeholder to confirm). All times are Bucharest time; money is stored in bani.

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

1. **Code on GitHub.** Push this folder to a private GitHub repository.
2. **Database on Neon.** Create a free project at neon.tech in the **EU (Frankfurt)** region. Copy the *pooled* connection string into `DATABASE_URL` and the *direct* one into `DIRECT_URL`.
3. **App on Vercel.** Import the repository at vercel.com and choose **Frankfurt (fra1)** as the region. Add these environment variables:
   - `DATABASE_URL`, `DIRECT_URL` from Neon
   - `SESSION_SECRET`: a random string of at least 32 characters
   - `APP_URL`: `https://app.carlala.eu`
   - `BLOB_READ_WRITE_TOKEN`: create a Blob store in Vercel (Storage tab) and connect it; Vercel fills this in
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: optional at first (see below)
4. **Create the tables.** Run once against the Neon database from your computer, with `DATABASE_URL` and `DIRECT_URL` set to the Neon values:

   ```bash
   npm run db:migrate
   ```

   Then create only the admin account (no demo data):

   ```bash
   SEED_ONLY_ADMIN=1 SEED_ADMIN_PASSWORD='choose-a-strong-password' npm run db:seed
   ```

5. **Domain.** In Vercel, add the domain `app.carlala.eu`. Then in cPanel, open **Zone Editor**, choose **carlala.eu** and add a **CNAME** record: name `app`, value `cname.vercel-dns.com`. Do not change the existing `carlala.eu` A record.

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
