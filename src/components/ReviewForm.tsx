import type { Dict } from "@/lib/i18n/en";
import { submitReview } from "@/app/actions/reviews";

/** Collapsible review form; works without JavaScript. */
export function ReviewForm({ bookingId, t, cta }: { bookingId: string; t: Dict; cta: string }) {
  return (
    <details className="w-full rounded-2xl bg-blush p-4 [&_summary]:cursor-pointer">
      <summary className="font-semibold">{cta}</summary>
      <form action={submitReview} className="mt-3 grid gap-3">
        <input type="hidden" name="bookingId" value={bookingId} />
        <fieldset>
          <legend className="label">{t.review.rating}</legend>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="flex cursor-pointer items-center gap-1 rounded-full bg-white px-3 py-1.5 ring-1 ring-line has-[:checked]:bg-ink has-[:checked]:text-blush">
                <input type="radio" name="rating" value={n} required className="sr-only" defaultChecked={n === 5} />★ {n}
              </label>
            ))}
          </div>
        </fieldset>
        <div><label className="label" htmlFor={`c-${bookingId}`}>{t.review.comment}</label>
          <textarea id={`c-${bookingId}`} name="comment" className="input min-h-20 bg-white" maxLength={1000} /></div>
        <button className="btn-ink btn-sm justify-self-start">{t.review.submit}</button>
      </form>
    </details>
  );
}
