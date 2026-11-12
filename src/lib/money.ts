/** Money is stored as integer bani (1 RON = 100 bani). */
export const toBani = (ron: number) => Math.round(ron * 100);
export const toRon = (bani: number) => bani / 100;

export function formatRon(bani: number, locale: "ro" | "en" = "ro") {
  const ron = bani / 100;
  const s = new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB", {
    minimumFractionDigits: Number.isInteger(ron) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(ron);
  return `${s} RON`;
}
