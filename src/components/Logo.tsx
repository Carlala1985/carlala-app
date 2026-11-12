/** Carlala logo: line-drawn car with the "la-la" waves, plus wordmark. */
export function Logo({ className = "h-9 w-auto", mono = false }: { className?: string; mono?: boolean }) {
  const ink = "#24163a";
  const accent = mono ? ink : "#ff6a4d";
  return (
    <svg viewBox="0 0 470 140" className={className} role="img" aria-label="Carlala">
      <g fill="none" stroke={ink} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 96 V78 c0-8 4-12 12-14 l14-4 18-22 c4-5 9-7 15-7 h26 c7 0 12 3 16 8 l16 21 h8 c8 0 13 6 13 14 v22" />
        <path d="M42 96 h44 M126 96 h20" />
      </g>
      <g fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round">
        <path d="M116 20 q8 -10 16 0 t16 0" />
        <path d="M128 4 q6 -7 12 0" />
      </g>
      <circle cx="54" cy="98" r="14" fill={ink} /><circle cx="54" cy="98" r="5" fill={accent} />
      <circle cx="116" cy="98" r="14" fill={ink} /><circle cx="116" cy="98" r="5" fill={accent} />
      <text x="176" y="104" fontFamily="var(--font-bricolage), sans-serif" fontWeight="800" fontSize="68" letterSpacing="-2" fill={ink}>carlala</text>
    </svg>
  );
}

/** Small car outline used as a photo placeholder. */
export function CarGlyph({ className = "w-1/2", color = "#24163a" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 170 110" className={className} aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 86 V70 c0-7 4-11 11-12 l12-4 16-20 c4-4 8-6 13-6 h24 c6 0 11 2 14 7 l15 19 h8 c7 0 12 5 12 12 v20" />
      </g>
      <circle cx="48" cy="88" r="13" fill={color} /><circle cx="98" cy="88" r="13" fill={color} />
    </svg>
  );
}
