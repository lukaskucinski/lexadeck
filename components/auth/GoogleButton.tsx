"use client";

import { useActionState } from "react";
import { signInWithGoogle } from "@/lib/actions/auth";

/**
 * Kicks off Google OAuth. The action redirects to the provider on success; on
 * the rare init failure it returns an error we surface inline.
 */
export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const [state, formAction, pending] = useActionState(signInWithGoogle, {});

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 border-[1.5px] border-line text-sm font-extrabold tracking-[0.1em] text-ink uppercase transition-colors hover:bg-ink hover:text-bg disabled:opacity-40"
      >
        {pending ? "Connecting…" : label}
      </button>
      {state.error && <p className="mt-2 text-sm font-bold text-coral">{state.error}</p>}
    </form>
  );
}

/** Labelled "or" divider shared by the login/signup forms. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 border-t border-line" />
      <span className="label-caps text-muted">or</span>
      <span className="h-px flex-1 border-t border-line" />
    </div>
  );
}
