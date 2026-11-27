import Link from "next/link";
import { notFound } from "next/navigation";
import type { Handover, HandoverPhoto, User } from "@prisma/client";
import { getDict, fmt } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { canRespond, canSubmit, REQUIRED_SLOTS, type Stage } from "@/lib/handover";
import { blobMode } from "@/lib/uploads";
import { displayName } from "@/lib/deletion";
import { HandoverForm, RespondForm } from "@/components/HandoverForms";
import { respondHandover, submitHandover } from "@/app/actions/handover";

type Q = { done?: string; error?: string; stage?: string };

export default async function HandoverPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Q> }) {
  const { id } = await params;
  const q = await searchParams;
  const user = await requireUser(`/bookings/${id}/handover`);
  const b = await db.booking.findUnique({
    where: { id },
    include: { renter: true, car: { include: { owner: true } }, handovers: { include: { photos: { orderBy: { createdAt: "asc" } } } } },
  });
  const isRenter = b?.renterId === user.id, isOwner = b?.car.ownerId === user.id, isAdmin = user.role === "ADMIN";
  if (!b || (!isRenter && !isOwner && !isAdmin)) notFound();
  const { t, locale } = await getDict();
  const h = t.handover;
  const people = new Map<string, User>([[b.renter.id, b.renter], [b.car.owner.id, b.car.owner]]);
  const nameOf = (uid: string | null) => (uid && people.get(uid) ? displayName(people.get(uid)!, t.account.deletedUser) : t.account.deletedUser);
  const pickup = b.handovers.find((x) => x.stage === "PICKUP"), ret = b.handovers.find((x) => x.stage === "RETURN");
  const participant = isRenter || isOwner;
  const mode = blobMode();
  const pickerLabels = { ...t.carForm, photos: "" };

  const report = (r: Handover & { photos: HandoverPhoto[] }, stage: Stage) => {
    const other = r.submittedById === b.renterId ? b.car.ownerId : b.renterId;
    const ordered = [...REQUIRED_SLOTS.flatMap((s) => r.photos.filter((p) => p.slot === s)), ...r.photos.filter((p) => p.slot === "EXTRA")];
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">{fmt(h.by, { name: nameOf(r.submittedById), when: formatDateTime(r.createdAt, locale) })}</p>
        <dl className="tnum grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-2xl bg-blush p-3"><dt className="text-sm text-muted">{h.km}</dt><dd className="text-xl font-bold">{r.odometerKm.toLocaleString(locale === "ro" ? "ro-RO" : "en-GB")}</dd></div>
          <div className="rounded-2xl bg-blush p-3"><dt className="text-sm text-muted">{h.fuel}</dt><dd className="text-xl font-bold">{r.fuelPercent} %</dd></div>
        </dl>
        {stage === "RETURN" && pickup && (
          <p className="tnum font-semibold">{fmt(h.driven, { km: (r.odometerKm - pickup.odometerKm).toLocaleString(locale === "ro" ? "ro-RO" : "en-GB") })} · {fmt(h.fuelChange, { from: pickup.fuelPercent, to: r.fuelPercent })}</p>
        )}
        {r.notes && <p className="rounded-2xl bg-blush px-4 py-3">“{r.notes}”</p>}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ordered.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-2xl ring-1 ring-line">
              <a href={p.url} target="_blank" rel="noopener">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={h[p.slot as keyof typeof h] as string ?? p.slot} className="aspect-[4/3] w-full object-cover" />
              </a>
              <p className="flex justify-between gap-2 bg-white px-3 py-1.5 text-xs"><b>{p.slot === "EXTRA" ? h.EXTRA.replace(/ \(.*\)/, "") : (h[p.slot as keyof typeof h] as string).replace(/ \(.*\)/, "")}</b>
                <span className="text-muted">{p.uploadedById !== r.submittedById ? nameOf(p.uploadedById) : ""}</span></p>
            </li>
          ))}
        </ul>
        {r.confirmedAt && <p className="alert-ok">{fmt(h.confirmed, { name: nameOf(r.confirmedById), when: formatDateTime(r.confirmedAt, locale) })}</p>}
        {r.objectionAt && (
          <div className="alert-err"><p>{fmt(h.disputed, { name: nameOf(r.confirmedById), when: formatDateTime(r.objectionAt, locale) })}</p>
            <p className="mt-1 font-normal">“{r.objection}”</p></div>
        )}
        {!r.confirmedAt && !r.objectionAt && (participant && canRespond(r, user.id)
          ? <RespondForm action={respondHandover} bookingId={b.id} stage={stage} mode={mode} labels={h} pickerLabels={pickerLabels} error={q.stage === stage ? q.error : undefined} />
          : <p className="alert-info">{fmt(h.waiting, { name: nameOf(other) })}</p>)}
      </div>
    );
  };

  const section = (stage: Stage, r: (Handover & { photos: HandoverPhoto[] }) | undefined) => (
    <section className="card flex flex-col gap-4 p-5 sm:p-7">
      <h2 className="text-2xl font-bold">{stage === "PICKUP" ? h.pickup : h.return}</h2>
      {r ? report(r, stage)
        : participant && canSubmit(stage, b, pickup, ret)
          ? <HandoverForm action={submitHandover} bookingId={b.id} stage={stage} mode={mode} labels={h} pickerLabels={pickerLabels} minKm={stage === "RETURN" ? pickup?.odometerKm : undefined} />
          : <p className="text-muted">{stage === "RETURN" && !pickup ? h.afterPickup : new Date() < new Date(b.start.getTime() - 2 * 3600000) ? h.notYet : h.closed}</p>}
    </section>
  );

  return (
    <div className="wrap max-w-[860px] py-10">
      <Link href={isOwner ? "/account/requests" : isRenter ? "/account/trips" : "/admin"} className="text-sm font-semibold text-muted hover:text-ink">← {isOwner ? t.requests.title : isRenter ? t.trips.title : t.admin.title}</Link>
      <h1 className="mt-2 text-4xl font-extrabold">{h.title}: {b.car.make} {b.car.model}</h1>
      <p className="tnum mt-1 text-muted">{formatDateTime(b.start, locale)} → {formatDateTime(b.end, locale)} · {b.car.neighbourhood}, {t.sectors[b.car.sector]}</p>
      <p className="mb-6 mt-3 max-w-[62ch]">{h.intro}</p>
      {q.done && <p className="alert-ok mb-4" role="status">{q.done === "submitted" ? h.submitted : h.responded}</p>}
      <div className="flex flex-col gap-6">
        {section("PICKUP", pickup)}
        {section("RETURN", ret)}
      </div>
    </div>
  );
}
