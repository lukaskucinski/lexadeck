"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/actions/auth";

const inputCls =
  "h-12 border-[1.5px] border-line bg-bg px-4 text-sm font-bold tracking-[0.04em] text-ink outline-none placeholder:tracking-[0.14em] placeholder:text-muted focus:bg-soft/40";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, {});

  return (
    <form action={formAction} className="mt-10 flex flex-col gap-3">
      <input
        type="email"
        name="email"
        placeholder="EMAIL"
        autoComplete="email"
        autoFocus
        required
        className={inputCls}
      />
      <input
        type="password"
        name="password"
        placeholder="PASSWORD"
        autoComplete="current-password"
        required
        className={inputCls}
      />
      {state.error && <p className="text-sm font-bold text-coral">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-12 bg-ink text-sm font-extrabold tracking-[0.1em] text-bg uppercase transition-colors hover:bg-coral disabled:opacity-40"
      >
        {pending ? "Signing in…" : "Sign in →"}
      </button>
    </form>
  );
}
