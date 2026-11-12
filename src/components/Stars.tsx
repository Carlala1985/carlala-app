/** Star rating shown as five stars plus the number, for screen readers too. */
export function Stars({ value, count, label }: { value: number; count?: number; label: string }) {
  const rounded = Math.round(value * 10) / 10;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm" aria-label={label.replace("{n}", String(rounded))}>
      <span aria-hidden="true" className="tracking-tight text-coral">
        {"★★★★★".slice(0, Math.round(value))}<span className="text-line">{"★★★★★".slice(Math.round(value))}</span>
      </span>
      <span className="tnum font-semibold">{rounded.toLocaleString()}</span>
      {count !== undefined && <span className="text-muted">({count})</span>}
    </span>
  );
}
