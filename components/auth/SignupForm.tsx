"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type SignUpState } from "@/lib/actions/auth";
import { GoogleButton, OrDivider } from "./GoogleButton";

const inputCls =
  "h-12 border-[1.5px] border-line bg-bg px-4 text-sm font-bold tracking-[0.04em] text-ink outline-none placeholder:tracking-[0.14em] placeholder:text-muted focus:bg-soft/40";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(signUp, {});

  if (state.needsConfirmation) {
    return (
      <div className="mt-10">
        <p className="text-sm font-extrabold tracking-[0.04em] text-ink uppercase">
          Check your email
        </p>
        <p className="mt-3 text-sm font-medium leading-relaxed text-muted">
          We sent a confirmation link to finish creating your account. Open it on this
          device and you&apos;ll land right back here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-3">
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
          placeholder="PASSWORD (8+ CHARACTERS)"
          autoComplete="new-password"
          minLength={8}
          required
          className={inputCls}
        />
        {state.error && <p className="text-sm font-bold text-coral">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="h-12 bg-ink text-sm font-extrabold tracking-[0.1em] text-bg uppercase transition-colors hover:bg-coral disabled:opacity-40"
        >
          {pending ? "Creating…" : "Create account →"}
        </button>
      </form>

      <OrDivider />
      <GoogleButton />

      <p className="label-caps text-center text-muted">
        already have an account?{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">
          sign in
        </Link>
      </p>
    </div>
  );
}
