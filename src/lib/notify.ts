import "server-only";
import { db } from "./db";
import { formatRon } from "./money";
import { formatDateTime } from "./time";
import { appUrl } from "./url";
import { sendEmail } from "./email/send";
import { emails, type TripInfo } from "./email/templates";

type Locale = "ro" | "en";
const loc = (l: string): Locale => (l === "en" ? "en" : "ro");
const first = (name: string) => name.split(" ")[0] || name;

type Event = "newRequest" | "accepted" | "declined" | "cancelled" | "paid" | "review";

/**
 * Emails the people involved in a booking. Each person gets it in their own language.
 * Never throws: notifications must not break the booking flow.
 */
export async function notifyBooking(bookingId: string, event: Event) {
  try {
    const b = await db.booking.findUnique({ where: { id: bookingId }, include: { renter: true, car: { include: { owner: true } } } });
    if (!b) return;
    const owner = b.car.owner, renter = b.renter;
    const info = (l: Locale, other: string): TripInfo => ({
      car: `${b.car.make} ${b.car.model}`,
      when: `${formatDateTime(b.start, l)} → ${formatDateTime(b.end, l)}`,
      area: b.car.neighbourhood,
      total: formatRon(b.totalPrice, l),
      earnings: formatRon(b.ownerEarnings, l),
      other,
      message: b.message || undefined,
      phone: renter.phone ?? undefined,
    });
    const base = appUrl();
    const toOwner = async (render: (l: Locale) => ReturnType<typeof emails.welcome>) => {
      const l = loc(owner.locale); const r = render(l);
      await sendEmail({ to: owner.email, toName: owner.name, tag: event, ...r });
    };
    const toRenter = async (render: (l: Locale) => ReturnType<typeof emails.welcome>) => {
      const l = loc(renter.locale); const r = render(l);
      await sendEmail({ to: renter.email, toName: renter.name, tag: event, ...r });
    };
    switch (event) {
      case "newRequest": return await toOwner((l) => emails.newRequest(l, info(l, renter.name), `${base}/account/requests`));
      case "accepted": return await toRenter((l) => emails.accepted(l, info(l, first(owner.name)), `${base}/account/trips`));
      case "declined": return await toRenter((l) => emails.declined(l, info(l, first(owner.name)), `${base}/cars`));
      case "cancelled": return await toOwner((l) => emails.cancelled(l, info(l, renter.name), `${base}/account/requests`));
      case "paid":
        await toRenter((l) => emails.paidRenter(l, info(l, first(owner.name)), `${base}/account/trips`));
        return await toOwner((l) => emails.paidOwner(l, info(l, renter.name), `${base}/account/requests`));
      case "review":
        await toRenter((l) => emails.review(l, info(l, first(owner.name)), `${base}/account/trips`));
        return await toOwner((l) => emails.review(l, info(l, first(renter.name)), `${base}/account/requests`));
    }
  } catch (e) {
    console.error(`notify ${event} for ${bookingId} failed:`, (e as Error).message);
  }
}

export async function notifyWelcome(user: { email: string; name: string; locale: string }) {
  const l = loc(user.locale);
  await sendEmail({ to: user.email, toName: user.name, tag: "welcome", ...emails.welcome(l, first(user.name), `${appUrl()}/cars`) });
}
