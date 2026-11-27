"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Paintable 7-day x 24-hour availability grid. Cell index = column * 24 + hour.
 * Mouse: click or drag to colour. Touch and keyboard: tap/Enter toggles one hour.
 * Day and hour labels toggle a whole column or row. Booked cells are fixed.
 */
export type GridColumn = { label: string; sub?: string; changed?: boolean; past?: boolean };
type Labels = { available: string; unavailable: string; booked: string; hoursPerWeek: string };
type Preset = { label: string; cells: number[] };

export function AgendaGrid({ columns, initial, booked = [], name, labels, presets = [], readOnly = false, onChange }: {
  columns: GridColumn[]; initial: number[]; booked?: number[]; name?: string; labels: Labels;
  presets?: Preset[]; readOnly?: boolean; onChange?: (cells: number[]) => void;
}) {
  const [sel, setSel] = useState(() => new Set(initial));
  const bookedSet = useMemo(() => new Set(booked), [booked]);
  const drag = useRef<{ value: boolean } | null>(null);
  const lastPointer = useRef<string>("");

  useEffect(() => {
    const stop = () => { drag.current = null; };
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  const editable = (i: number) => !readOnly && !bookedSet.has(i) && !columns[Math.floor(i / 24)]?.past;
  const update = (fn: (s: Set<number>) => void) => setSel((prev) => {
    const next = new Set(prev); fn(next); onChange?.([...next].sort((a, b) => a - b)); return next;
  });
  const setCell = (i: number, v: boolean) => { if (editable(i)) update((s) => (v ? s.add(i) : s.delete(i))); };
  const toggleMany = (cells: number[]) => {
    const ok = cells.filter(editable);
    const allOn = ok.every((i) => sel.has(i));
    update((s) => ok.forEach((i) => (allOn ? s.delete(i) : s.add(i))));
  };

  const total = sel.size;
  return (
    <div className="flex flex-col gap-3">
      {name && <input type="hidden" name={name} value={JSON.stringify([...sel].sort((a, b) => a - b))} />}
      {presets.length > 0 && !readOnly && (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button key={p.label} type="button" className="btn-ghost btn-sm"
              onClick={() => update((s) => { s.clear(); p.cells.filter(editable).forEach((i) => s.add(i)); })}>{p.label}</button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-2"><i className="inline-block size-3.5 rounded bg-coral" />{labels.available}</span>
        <span className="inline-flex items-center gap-2"><i className="inline-block size-3.5 rounded bg-white ring-1 ring-line" />{labels.unavailable}</span>
        {booked.length > 0 && <span className="inline-flex items-center gap-2"><i className="inline-block size-3.5 rounded bg-ink" />{labels.booked}</span>}
        {!readOnly && <span className="tnum ml-auto">{labels.hoursPerWeek.replace("{n}", String(total))}</span>}
      </div>
      <div className="select-none overflow-hidden rounded-2xl bg-white ring-1 ring-line" role="grid" aria-readonly={readOnly}>
        <div className="grid grid-cols-[2.6rem_repeat(7,minmax(0,1fr))] border-b border-line" role="row">
          <span />
          {columns.map((c, col) => (
            <button key={col} type="button" role="columnheader" disabled={readOnly || c.past}
              onClick={() => toggleMany(Array.from({ length: 24 }, (_, h) => col * 24 + h))}
              className={`relative flex flex-col items-center px-0.5 py-2 text-center leading-tight ${c.past ? "opacity-40" : ""} ${readOnly ? "cursor-default" : "hover:bg-blush"}`}>
              <span className="text-[13px] font-bold">{c.label}</span>
              {c.sub && <span className="text-[11px] text-muted">{c.sub}</span>}
              {c.changed && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-coral" />}
            </button>
          ))}
        </div>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="grid grid-cols-[2.6rem_repeat(7,minmax(0,1fr))]" role="row">
            <button type="button" role="rowheader" disabled={readOnly}
              onClick={() => toggleMany(columns.map((_, col) => col * 24 + h))}
              className={`tnum border-r border-line pr-1.5 text-right text-[11px] text-muted ${readOnly ? "cursor-default" : "hover:bg-blush"}`}>
              {String(h).padStart(2, "0")}
            </button>
            {columns.map((c, col) => {
              const i = col * 24 + h, isBooked = bookedSet.has(i), on = sel.has(i);
              return (
                <button key={col} type="button" role="gridcell" aria-selected={on} disabled={!editable(i) && !readOnly}
                  aria-label={`${c.label} ${c.sub ?? ""} ${String(h).padStart(2, "0")}:00 ${isBooked ? labels.booked : on ? labels.available : labels.unavailable}`}
                  onPointerDown={(e) => {
                    lastPointer.current = e.pointerType;
                    if (e.pointerType !== "mouse" || !editable(i)) return;
                    e.preventDefault();
                    drag.current = { value: !on };
                    setCell(i, !on);
                  }}
                  onPointerEnter={(e) => { if (drag.current && e.pointerType === "mouse" && e.buttons === 1) setCell(i, drag.current.value); }}
                  onClick={() => { if (lastPointer.current !== "mouse") setCell(i, !on); lastPointer.current = ""; }}
                  className={`h-6 border-b border-l border-line/70 transition-colors ${readOnly ? "cursor-default" : ""} ${
                    isBooked ? "bg-ink" : on ? "bg-coral" : "bg-white"} ${c.past ? "opacity-40" : ""} ${h % 6 === 5 ? "border-b-line" : ""}`} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
