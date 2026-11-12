import type { Dict } from "./i18n/en";
import { FUELS, SECTORS, TRANSMISSIONS } from "./cars";

export const carOptions = (t: Dict) => ({
  transmission: TRANSMISSIONS.map((v) => ({ value: v, label: t.transmission[v] })),
  fuel: FUELS.map((v) => ({ value: v, label: t.fuel[v] })),
  sector: SECTORS.map((v) => ({ value: v, label: t.sectors[v] })),
});

export const carFormErrors = (t: Dict) => ({ ...t.carForm, forbidden: t.errors.forbidden, generic: t.errors.generic });
