/**
 * Development seed: an admin, a few demo owners and renters, and cars around Bucharest.
 * Demo accounts use @demo.carlala.eu addresses and the password "carlala-demo".
 * In production run only with SEED_ONLY_ADMIN=1 (creates the admin account and nothing else).
 */
import { PrismaClient, type Fuel, type Sector, type Transmission } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const db = new PrismaClient();
const DEMO_PASSWORD = "carlala-demo";

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "hello@carlala.eu").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(9).toString("base64url");
  const existing = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await db.user.create({ data: { email: adminEmail, name: "Carlala Admin", role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 10) } });
    console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
  } else console.log(`Admin already exists: ${adminEmail}`);
  if (process.env.SEED_ONLY_ADMIN) return;

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const people = [
    { email: "ana@demo.carlala.eu", name: "Ana Popescu" },
    { email: "mihai@demo.carlala.eu", name: "Mihai Ionescu" },
    { email: "ioana@demo.carlala.eu", name: "Ioana Dumitrescu" },
    // Radu is the demo renter: his driver check is already passed.
    { email: "radu@demo.carlala.eu", name: "Radu Stan", phone: "+40 700 000 000", driverStatus: "VERIFIED" as const, driverVerifiedAt: new Date(), driverName: "RADU STAN", licenceCountry: "RO" },
  ];
  const users = [];
  for (const p of people) users.push(await db.user.upsert({ where: { email: p.email }, update: {}, create: { ...p, passwordHash: hash } }));
  const [ana, mihai, ioana, radu] = users;

  if (await db.car.count() > 0) return console.log("Cars already seeded.");
  const cars: [string, string, string, number, Transmission, Fuel, Sector, string, number, number, string][] = [
    [ana.id, "Dacia", "Spring", 2023, "AUTOMATIC", "ELECTRIC", "S1", "Floreasca", 15, 140, "Small electric city car, ideal for errands. Type 2 cable included. Parked near Parcul Floreasca."],
    [ana.id, "Dacia", "Duster", 2021, "MANUAL", "DIESEL", "S1", "Aviației", 22, 210, "Roomy SUV for trips to the mountains. Roof bars on request."],
    [mihai.id, "Volkswagen", "Golf", 2019, "MANUAL", "PETROL", "S2", "Tei", 18, 170, "Reliable compact, Apple CarPlay, child seat available."],
    [mihai.id, "Toyota", "Corolla Hybrid", 2022, "AUTOMATIC", "HYBRID", "S2", "Colentina", 21, 190, "Quiet, economical hybrid. Great for the airport run."],
    [ioana.id, "Renault", "Clio", 2020, "MANUAL", "PETROL", "S3", "Titan", 14, 130, "Easy to park, perfect for the city. Pick-up next to Parcul IOR."],
    [ioana.id, "Skoda", "Octavia Combi", 2020, "AUTOMATIC", "DIESEL", "S4", "Tineretului", 20, 185, "Big boot, ideal for IKEA or moving boxes."],
    [radu.id, "Dacia", "Sandero", 2022, "MANUAL", "LPG", "S6", "Drumul Taberei", 12, 115, "Cheap to run on LPG. Clean and non-smoking."],
    [radu.id, "Tesla", "Model 3", 2021, "AUTOMATIC", "ELECTRIC", "S5", "Cotroceni", 45, 420, "Long range, Supercharger access billed at cost."],
  ];
  const created = [];
  for (const [ownerId, make, model, year, transmission, fuel, sector, neighbourhood, h, d, description] of cars) {
    created.push(await db.car.create({ data: { ownerId, make, model, year, seats: 5, transmission, fuel, sector, neighbourhood, description, pricePerHour: h * 100, pricePerDay: d * 100 } }));
  }
  // One finished trip with reviews, so ratings show up.
  const start = new Date(Date.now() - 10 * 86400000), end = new Date(start.getTime() + 26 * 3600000);
  const b = await db.booking.create({ data: { carId: created[0].id, renterId: radu.id, start, end, status: "COMPLETED", totalPrice: 17000, platformFee: 4250, ownerEarnings: 12750, paidAt: start } });
  await db.review.create({ data: { bookingId: b.id, authorId: radu.id, subjectId: ana.id, rating: 5, comment: "Super easy pick-up and a spotless car. Thanks, Ana!" } });
  await db.review.create({ data: { bookingId: b.id, authorId: ana.id, subjectId: radu.id, rating: 5, comment: "Returned on time and fully charged." } });
  console.log(`Seeded ${users.length} demo users (password: ${DEMO_PASSWORD}) and ${created.length} cars.`);
}

main().finally(() => db.$disconnect());
