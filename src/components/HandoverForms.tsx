"use client";
import { useActionState, useState } from "react";
import { PhotoPicker } from "./PhotoPicker";
import type { HandoverState } from "@/app/actions/handover";

type Mode = "token" | "oidc" | "none";
const SLOTS = ["FRONT", "BACK", "LEFT", "RIGHT", "DASHBOARD"] as const;

/** Counts uploads in progress across several pickers. */
function useBusy() {
  const [n, setN] = useState(0);
  return { busy: n > 0, onBusyChange: (b: boolean) => setN((x) => Math.max(0, x + (b ? 1 : -1))) };
}

export function HandoverForm({ action, bookingId, stage, mode, labels, pickerLabels, minKm }: {
  action: (s: HandoverState, f: FormData) => Promise<HandoverState>; bookingId: string; stage: "PICKUP" | "RETURN";
  mode: Mode; labels: Record<string, string>; pickerLabels: Record<string, string>; minKm?: number;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { busy, onBusyChange } = useBusy();
  // React clears uncontrolled fields after a form action, even when it returns an error: keep the readings in state.
  const [km, setKm] = useState(""), [fuel, setFuel] = useState(""), [notes, setNotes] = useState("");
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="stage" value={stage} />
      <div className="grid gap-4 sm:grid-cols-2">
        {SLOTS.map((slot) => (
          <div key={slot} className="rounded-2xl bg-blush p-4">
            <PhotoPicker id={`${stage}-${slot}`} name={`photo_${slot}`} folder="handovers" maxSide={2400} max={1} mode={mode}
              label={labels[slot]} hint="" labels={pickerLabels} onBusyChange={onBusyChange} />
          </div>
        ))}
        <div className="rounded-2xl bg-blush p-4 sm:col-span-2">
          <PhotoPicker id={`${stage}-EXTRA`} name="photo_EXTRA" folder="handovers" maxSide={2400} max={10} mode={mode}
            label={labels.EXTRA} hint={labels.extraHint} labels={pickerLabels} onBusyChange={onBusyChange} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor={`${stage}-km`}>{labels.km}</label>
          <input className="input tnum" id={`${stage}-km`} name="km" type="number" inputMode="numeric" min={minKm ?? 0} max={2000000} step={1} required value={km} onChange={(e) => setKm(e.target.value)} /></div>
        <div><label className="label" htmlFor={`${stage}-fuel`}>{labels.fuel}</label>
          <input className="input tnum" id={`${stage}-fuel`} name="fuel" type="number" inputMode="numeric" min={0} max={100} step={1} required value={fuel} onChange={(e) => setFuel(e.target.value)} /></div>
      </div>
      <div><label className="label" htmlFor={`${stage}-notes`}>{labels.notes}</label>
        <textarea className="input min-h-20" id={`${stage}-notes`} name="notes" maxLength={1000} placeholder={labels.notesPlaceholder} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      {state?.error && <p className="alert-err" role="alert">{labels[state.error] ?? labels.errPhotos}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-coral" disabled={pending || busy}>{labels.submit}</button>
        <span className="text-sm text-muted">{labels.locked}</span>
      </div>
    </form>
  );
}

/** Confirm, or report a difference with a comment and optional photos. */
export function RespondForm({ action, bookingId, stage, mode, labels, pickerLabels, error }: {
  action: (f: FormData) => Promise<void>; bookingId: string; stage: "PICKUP" | "RETURN";
  mode: Mode; labels: Record<string, string>; pickerLabels: Record<string, string>; error?: string;
}) {
  const { busy, onBusyChange } = useBusy();
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-lilac p-4">
      <p className="font-semibold">{labels.respondTitle}</p>
      <form action={action}>
        <input type="hidden" name="bookingId" value={bookingId} /><input type="hidden" name="stage" value={stage} />
        <button name="answer" value="confirm" className="btn-ink btn-sm">{labels.confirm}</button>
      </form>
      <details className="group" open={!!error}>
        <summary className="cursor-pointer text-sm font-semibold underline decoration-coral decoration-2 underline-offset-4">{labels.object}</summary>
        <form action={action} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="bookingId" value={bookingId} /><input type="hidden" name="stage" value={stage} />
          <p className="text-sm text-muted">{labels.objectHint}</p>
          <textarea className="input min-h-24 bg-white" name="comment" maxLength={2000} required aria-label={labels.object} />
          <PhotoPicker id={`${stage}-OBJ`} name="photo_OBJECTION" folder="handovers" maxSide={2400} max={10} mode={mode}
            label={labels.objectPhotos} hint="" labels={pickerLabels} onBusyChange={onBusyChange} />
          {error && <p className="alert-err" role="alert">{labels[error] ?? error}</p>}
          <button name="answer" value="object" className="btn-ghost btn-sm self-start" disabled={busy}>{labels.sendObjection}</button>
        </form>
      </details>
    </div>
  );
}
