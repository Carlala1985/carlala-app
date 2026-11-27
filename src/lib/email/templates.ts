/**
 * Carlala's transactional emails, in Romanian and English.
 * Each function returns subject, HTML and plain text. Anything a user typed is escaped.
 */
type Locale = "ro" | "en";
export type Rendered = { subject: string; html: string; text: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const FOOTER: Record<Locale, string> = {
  ro: "Primești acest email pentru că ai un cont Carlala. Carlala este operat de GUFFROY SRL, București. Întrebări? Scrie-ne la hello@carlala.eu.",
  en: "You're getting this email because you have a Carlala account. Carlala is run by GUFFROY SRL, Bucharest. Questions? Write to hello@carlala.eu.",
};

type Block = { p?: string; quote?: string; rows?: [string, string][] };

/** Simple, email-client-safe layout: one column, inline styles, coral button. */
function layout(locale: Locale, o: { heading: string; blocks: Block[]; button?: { label: string; url: string }; after?: string }): { html: string; text: string } {
  const ink = "#24163a", coral = "#ff6a4d", muted = "#675a74";
  const parts: string[] = [];
  const text: string[] = [o.heading, ""];
  for (const b of o.blocks) {
    if (b.p) { parts.push(`<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${ink}">${b.p}</p>`); text.push(b.p.replace(/<[^>]+>/g, ""), ""); }
    if (b.quote) { parts.push(`<p style="margin:0 0 16px;padding:12px 16px;background:#fff4ef;border-radius:12px;font-size:15px;line-height:1.5;color:${ink}">“${b.quote}”</p>`); text.push(`"${b.quote.replace(/&[a-z#0-9]+;/g, " ")}"`, ""); }
    if (b.rows) {
      parts.push(`<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 18px;font-size:15px">${b.rows.map(([k, v]) =>
        `<tr><td style="padding:8px 0;border-top:1px solid #efd9d0;color:${muted}">${k}</td><td style="padding:8px 0;border-top:1px solid #efd9d0;text-align:right;font-weight:600;color:${ink}">${v}</td></tr>`).join("")}</table>`);
      text.push(...b.rows.map(([k, v]) => `${k}: ${v}`), "");
    }
  }
  if (o.button) {
    parts.push(`<p style="margin:8px 0 20px"><a href="${o.button.url}" style="display:inline-block;background:${ink};color:#fff4ef;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:999px">${o.button.label}</a></p>`);
    text.push(`${o.button.label}: ${o.button.url}`, "");
  }
  if (o.after) { parts.push(`<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:${muted}">${o.after}</p>`); text.push(o.after, ""); }
  text.push("—", FOOTER[locale]);
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#fff4ef;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:24px 12px">
<table role="presentation" style="width:100%;max-width:560px;margin:0 auto;border-collapse:collapse;background:#ffffff;border-radius:20px">
<tr><td style="padding:28px 28px 8px"><span style="font-size:22px;font-weight:800;color:${ink};letter-spacing:-0.5px">carlala</span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${coral};margin-left:4px"></span></td></tr>
<tr><td style="padding:8px 28px 12px"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:${ink}">${o.heading}</h1>${parts.join("")}</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;padding:0 12px;font-size:12px;line-height:1.5;color:${muted};text-align:center">${FOOTER[locale]}</p>
</td></tr></table></body></html>`;
  return { html, text: text.join("\n") };
}

export type TripInfo = { car: string; when: string; area: string; total: string; earnings?: string; other: string; message?: string; phone?: string };

const T = {
  welcome: {
    ro: (name: string, url: string) => ({ s: "Bun venit pe Carlala", h: `Bun venit, ${name}!`, b: [{ p: "Contul tău Carlala este gata. Poți închiria mașini de la vecinii tăi din București sau îți poți lista propria mașină și câștiga cât stă parcată." }], btn: { label: "Caută o mașină", url } }),
    en: (name: string, url: string) => ({ s: "Welcome to Carlala", h: `Welcome, ${name}!`, b: [{ p: "Your Carlala account is ready. You can rent cars from your neighbours in Bucharest, or list your own car and earn while it's parked." }], btn: { label: "Find a car", url } }),
  },
  newRequest: {
    ro: (i: TripInfo, url: string) => ({ s: `Cerere nouă pentru ${i.car}`, h: "Ai o cerere nouă", b: [{ p: `<b>${i.other}</b> vrea să închirieze ${i.car}.` }, ...(i.message ? [{ quote: i.message }] : []), { rows: [["Când", i.when], ["Câștigi", i.earnings ?? ""], ["Total plătit de șofer", i.total]] as [string, string][] }], btn: { label: "Acceptă sau refuză", url }, after: "Cererile la care nu răspunzi expiră la ora de preluare." }),
    en: (i: TripInfo, url: string) => ({ s: `New request for your ${i.car}`, h: "You have a new request", b: [{ p: `<b>${i.other}</b> would like to rent your ${i.car}.` }, ...(i.message ? [{ quote: i.message }] : []), { rows: [["When", i.when], ["You earn", i.earnings ?? ""], ["Renter pays", i.total]] as [string, string][] }], btn: { label: "Accept or decline", url }, after: "Requests you don't answer expire at the pick-up time." }),
  },
  accepted: {
    ro: (i: TripInfo, url: string) => ({ s: `Cererea ta pentru ${i.car} a fost acceptată`, h: "Cererea ta a fost acceptată!", b: [{ p: `${i.other} a acceptat cererea ta. Plătește acum ca să confirmi rezervarea.` }, { rows: [["Mașina", i.car], ["Când", i.when], ["Zona de preluare", i.area], ["Total", i.total]] as [string, string][] }], btn: { label: "Plătește și confirmă", url }, after: "Mașina rămâne rezervată pentru tine doar după plată." }),
    en: (i: TripInfo, url: string) => ({ s: `Your request for the ${i.car} was accepted`, h: "Your request was accepted!", b: [{ p: `${i.other} accepted your request. Pay now to confirm the trip.` }, { rows: [["Car", i.car], ["When", i.when], ["Pick-up area", i.area], ["Total", i.total]] as [string, string][] }], btn: { label: "Pay and confirm", url }, after: "The car is only held for you once you've paid." }),
  },
  declined: {
    ro: (i: TripInfo, url: string) => ({ s: `Cererea ta pentru ${i.car} nu a fost acceptată`, h: "Cererea nu a fost acceptată", b: [{ p: `Ne pare rău, ${i.other} nu poate oferi ${i.car} pentru ${i.when}. Nu ți s-a luat niciun ban.` }], btn: { label: "Caută altă mașină", url } }),
    en: (i: TripInfo, url: string) => ({ s: `Your request for the ${i.car} wasn't accepted`, h: "Your request wasn't accepted", b: [{ p: `Sorry, ${i.other} can't offer the ${i.car} for ${i.when}. You haven't been charged.` }], btn: { label: "Find another car", url } }),
  },
  cancelled: {
    ro: (i: TripInfo, url: string) => ({ s: `Cererea pentru ${i.car} a fost anulată`, h: "Cerere anulată", b: [{ p: `${i.other} a anulat cererea pentru ${i.car} (${i.when}). Mașina ta este din nou disponibilă pentru acel interval.` }], btn: { label: "Vezi cererile", url } }),
    en: (i: TripInfo, url: string) => ({ s: `The request for your ${i.car} was cancelled`, h: "Request cancelled", b: [{ p: `${i.other} cancelled the request for your ${i.car} (${i.when}). Your car is available again for that time.` }], btn: { label: "See requests", url } }),
  },
  paidRenter: {
    ro: (i: TripInfo, url: string) => ({ s: `Rezervare confirmată: ${i.car}`, h: "Rezervarea este confirmată", b: [{ p: `Plata a fost primită. ${i.other} te așteaptă cu cheile.` }, { rows: [["Mașina", i.car], ["Când", i.when], ["Zona de preluare", i.area], ["Plătit", i.total]] as [string, string][] }], btn: { label: "Vezi rezervarea", url }, after: "La preluare, fă poze mașinii din toate părțile, împreună cu proprietarul." }),
    en: (i: TripInfo, url: string) => ({ s: `Trip confirmed: ${i.car}`, h: "Your trip is confirmed", b: [{ p: `Payment received. ${i.other} will hand you the keys.` }, { rows: [["Car", i.car], ["When", i.when], ["Pick-up area", i.area], ["Paid", i.total]] as [string, string][] }], btn: { label: "See your trip", url }, after: "At pick-up, take photos of the car from every side together with the owner." }),
  },
  paidOwner: {
    ro: (i: TripInfo, url: string) => ({ s: `Rezervare confirmată pentru ${i.car}`, h: "Rezervare confirmată", b: [{ p: `<b>${i.other}</b> a plătit rezervarea pentru ${i.car}.` }, { rows: [["Când", i.when], ["Telefon șofer", i.phone || "—"], ["Câștigi", i.earnings ?? ""]] as [string, string][] }], btn: { label: "Vezi detaliile", url }, after: "Contactează șoferul ca să stabiliți predarea cheilor." }),
    en: (i: TripInfo, url: string) => ({ s: `Trip confirmed for your ${i.car}`, h: "Trip confirmed", b: [{ p: `<b>${i.other}</b> has paid for the trip in your ${i.car}.` }, { rows: [["When", i.when], ["Renter's phone", i.phone || "—"], ["You earn", i.earnings ?? ""]] as [string, string][] }], btn: { label: "See details", url }, after: "Get in touch with the renter to arrange the key hand-over." }),
  },
  review: {
    ro: (i: TripInfo, url: string) => ({ s: `Cum a fost cu ${i.car}?`, h: "Cum a fost?", b: [{ p: `Închirierea ${i.car} (${i.when}) s-a încheiat. Lasă o recenzie pentru ${i.other}: ajută comunitatea să aibă încredere.` }], btn: { label: "Lasă o recenzie", url } }),
    en: (i: TripInfo, url: string) => ({ s: `How was the ${i.car}?`, h: "How did it go?", b: [{ p: `The trip in the ${i.car} (${i.when}) has ended. Leave a review for ${i.other}: it helps everyone trust each other.` }], btn: { label: "Leave a review", url } }),
  },
  handover: {
    ro: (i: TripInfo, stage: string, url: string) => ({ s: `Confirmă raportul de ${stage.toLowerCase()}: ${i.car}`, h: `Raport de ${stage.toLowerCase()} de confirmat`, b: [{ p: `${i.other} a completat raportul de ${stage.toLowerCase()} pentru ${i.car}, cu poze, kilometri și nivelul combustibilului. Verifică-l și confirmă-l sau semnalează o diferență.` }], btn: { label: "Verifică raportul", url }, after: "Ai 7 zile să răspunzi." }),
    en: (i: TripInfo, stage: string, url: string) => ({ s: `Please confirm the ${stage.toLowerCase()} report: ${i.car}`, h: `${stage} report to confirm`, b: [{ p: `${i.other} filled in the ${stage.toLowerCase()} report for the ${i.car}, with photos, kilometres and fuel level. Check it, then confirm it or report a difference.` }], btn: { label: "Check the report", url }, after: "You have 7 days to answer." }),
  },
  reset: {
    ro: (url: string) => ({ s: "Resetează-ți parola Carlala", h: "Resetează-ți parola", b: [{ p: "Cineva (sperăm că tu) a cerut o parolă nouă pentru contul tău Carlala. Linkul este valabil o oră și poate fi folosit o singură dată." }], btn: { label: "Alege o parolă nouă", url }, after: "Dacă nu ai cerut tu, ignoră acest email: parola ta rămâne neschimbată." }),
    en: (url: string) => ({ s: "Reset your Carlala password", h: "Reset your password", b: [{ p: "Someone (hopefully you) asked for a new password for your Carlala account. The link works for one hour and only once." }], btn: { label: "Choose a new password", url }, after: "If this wasn't you, ignore this email: your password stays the same." }),
  },
};

type Spec = { s: string; h: string; b: Block[]; btn?: { label: string; url: string }; after?: string };
const render = (locale: Locale, x: Spec): Rendered => ({ subject: x.s, ...layout(locale, { heading: x.h, blocks: x.b, button: x.btn, after: x.after }) });

/** Escape every user-provided field once, here. */
const safe = (i: TripInfo): TripInfo => ({
  ...i, car: esc(i.car), other: esc(i.other), area: esc(i.area),
  message: i.message ? esc(i.message) : undefined, phone: i.phone ? esc(i.phone) : undefined,
});

export const emails = {
  welcome: (l: Locale, name: string, url: string) => render(l, T.welcome[l](esc(name), url)),
  newRequest: (l: Locale, i: TripInfo, url: string) => render(l, T.newRequest[l](safe(i), url)),
  accepted: (l: Locale, i: TripInfo, url: string) => render(l, T.accepted[l](safe(i), url)),
  declined: (l: Locale, i: TripInfo, url: string) => render(l, T.declined[l](safe(i), url)),
  cancelled: (l: Locale, i: TripInfo, url: string) => render(l, T.cancelled[l](safe(i), url)),
  paidRenter: (l: Locale, i: TripInfo, url: string) => render(l, T.paidRenter[l](safe(i), url)),
  paidOwner: (l: Locale, i: TripInfo, url: string) => render(l, T.paidOwner[l](safe(i), url)),
  review: (l: Locale, i: TripInfo, url: string) => render(l, T.review[l](safe(i), url)),
  reset: (l: Locale, url: string) => render(l, T.reset[l](url)),
  handover: (l: Locale, i: TripInfo, stage: string, url: string) => render(l, T.handover[l](safe(i), esc(stage), url)),
};
