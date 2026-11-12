"use client";
import { useActionState } from "react";
import Link from "next/link";
import type { AuthState } from "@/app/actions/auth";

type Labels = Record<string, string>;

export function AuthForm({ mode, action, labels, errors, next }: {
  mode: "login" | "signup";
  action: (s: AuthState, f: FormData) => Promise<AuthState>;
  labels: Labels; errors: Labels; next: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const v = state?.values ?? {};
  return (
    <form action={formAction} className="card flex flex-col gap-4 p-6 sm:p-8" noValidate>
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <div><label className="label" htmlFor="name">{labels.name}</label>
          <input className="input" id="name" name="name" autoComplete="name" required defaultValue={v.name} /></div>
      )}
      <div><label className="label" htmlFor="email">{labels.email}</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} /></div>
      <div><label className="label" htmlFor="password">{labels.password}</label>
        <input className="input" id="password" name="password" type="password" required minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>
      {mode === "signup" && (
        <div><label className="label" htmlFor="phone">{labels.phone}</label>
          <input className="input" id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} /></div>
      )}
      {state?.error && <p className="alert-err" role="alert">{errors[state.error] ?? errors.generic}</p>}
      <button className="btn-ink mt-1" disabled={pending}>{mode === "login" ? labels.login : labels.signup}</button>
      {mode === "signup" && <p className="text-[13px] text-muted">{labels.terms}</p>}
      <p className="text-[15px] text-muted">
        {mode === "login" ? labels.noAccount : labels.haveAccount}{" "}
        <Link className="font-semibold text-ink underline decoration-coral decoration-2 underline-offset-4"
          href={`/${mode === "login" ? "signup" : "login"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
          {mode === "login" ? labels.signup : labels.login}
        </Link>
      </p>
    </form>
  );
}
