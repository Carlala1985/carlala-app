/**
 * Two-step delete: the first button only reveals the warning and the real delete button.
 * Works without JavaScript (uses <details>).
 */
export function ConfirmDelete({ action, fields, cta, text, confirm, small = true }: {
  action: (f: FormData) => Promise<void>; fields: Record<string, string>;
  cta: string; text: string; confirm: string; small?: boolean;
}) {
  return (
    <details className="group">
      <summary className={`btn-ghost ${small ? "btn-sm" : ""} list-none text-err ring-err [&::-webkit-details-marker]:hidden`}>{cta}</summary>
      <div className="mt-2 flex max-w-md flex-col gap-3 rounded-2xl bg-[#fde8e6] p-4 text-[15px]">
        <p>{text}</p>
        <form action={action}>
          {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <button className="btn btn-sm bg-err text-white">{confirm}</button>
        </form>
      </div>
    </details>
  );
}
