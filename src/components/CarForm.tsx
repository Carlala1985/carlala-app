"use client";
import { useActionState, useState } from "react";
import { PhotoPicker } from "./PhotoPicker";
import type { CarFormState } from "@/app/actions/cars";

type Opt = { value: string; label: string };
type CarValues = {
  id?: string; make?: string; model?: string; year?: number; seats?: number; transmission?: string; fuel?: string;
  sector?: string; neighbourhood?: string; description?: string; pricePerHour?: number; pricePerDay?: number;
};

export function CarForm({ action, car, labels, errors, options, photoRoom, directUpload }: {
  action: (s: CarFormState, f: FormData) => Promise<CarFormState>;
  car?: CarValues; labels: Record<string, string>; errors: Record<string, string>;
  options: { transmission: Opt[]; fuel: Opt[]; sector: Opt[] }; photoRoom: number; directUpload: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [uploading, setUploading] = useState(false);
  const c = car ?? {};
  const field = (name: keyof CarValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} required defaultValue={c[name] as string | number | undefined} {...props} />
    </div>
  );
  const select = (name: keyof CarValues, label: string, opts: Opt[]) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select className="input" id={name} name={name} defaultValue={(c[name] as string) ?? opts[0].value}>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
  return (
    <form action={formAction} className="card grid gap-5 p-6 sm:p-8">
      {c.id && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("make", labels.make, { placeholder: "Dacia" })}
        {field("model", labels.model, { placeholder: "Sandero" })}
        {field("year", labels.year, { type: "number", min: 1990, max: new Date().getFullYear() + 1, inputMode: "numeric" })}
        {field("seats", labels.seats, { type: "number", min: 2, max: 9, inputMode: "numeric", defaultValue: c.seats ?? 5 })}
        {select("transmission", labels.transmission, options.transmission)}
        {select("fuel", labels.fuel, options.fuel)}
        {select("sector", labels.sector, options.sector)}
        <div>
          <label className="label" htmlFor="neighbourhood">{labels.neighbourhood}</label>
          <input className="input" id="neighbourhood" name="neighbourhood" required defaultValue={c.neighbourhood} />
          <p className="hint">{labels.neighbourhoodHint}</p>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">{labels.description}</label>
        <textarea className="input min-h-28" id="description" name="description" defaultValue={c.description} maxLength={2000} />
        <p className="hint">{labels.descriptionHint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("pricePerHour", labels.pricePerHour, { type: "number", min: 1, max: 5000, step: "0.5", inputMode: "decimal", defaultValue: c.pricePerHour ?? 15 })}
        {field("pricePerDay", labels.pricePerDay, { type: "number", min: 1, max: 5000, step: "1", inputMode: "decimal", defaultValue: c.pricePerDay ?? 150 })}
        <p className="hint sm:col-span-2 -mt-2">{labels.priceHint}</p>
      </div>
      {photoRoom > 0 && <PhotoPicker max={photoRoom} direct={directUpload} labels={labels} onBusyChange={setUploading} />}
      {state?.error && <p className="alert-err" role="alert">{errors[state.error] ?? errors.generic}</p>}
      <div><button className="btn-ink" disabled={pending || uploading}>{c.id ? labels.save : labels.create}</button></div>
    </form>
  );
}
