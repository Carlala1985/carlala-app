"use client";
import { useActionState } from "react";
import type { ResetState } from "@/app/actions/password";

export function ResetForm({ action, token, labels }: {
  action: (s: ResetState, f: FormData) => Promise<ResetState>; token: string; labels: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="card flex flex-col gap-4 p-6 sm:p-8">
      <input type="hidden" name="token" value={token} />
      <div><label className="label" htmlFor="password">{labels.newPassword}</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
      {state?.error && <p className="alert-err" role="alert">{labels[state.error]}</p>}
      <button className="btn-ink" disabled={pending}>{labels.resetSubmit}</button>
    </form>
  );
}
