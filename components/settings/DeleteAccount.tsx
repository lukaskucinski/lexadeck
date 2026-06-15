"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/lib/actions/account";
import { Button } from "@/components/ui/Button";

/**
 * Self-serve account deletion. Collapsed by default; expanding reveals a typed
 * email confirmation before the destructive action can fire (also re-checked
 * server-side). The action signs out and redirects to /welcome on success.
 */
export function DeleteAccount({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteAccountState, FormData>(
    deleteAccount,
    {},
  );

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-[0.74rem] font-medium text-muted">
          Permanently deletes your account and every deck, card and review. This cannot be undone.
        </p>
        <Button type="button" variant="danger" onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-sm font-medium leading-relaxed text-muted">
        This permanently removes your account and all data. Type{" "}
        <span className="font-bold text-ink">{email}</span> to confirm.
      </p>
      <input
        type="text"
        name="confirm"
        autoComplete="off"
        autoFocus
        placeholder="your email"
        className="h-12 max-w-sm border-[1.5px] border-line bg-bg px-4 text-sm font-bold tracking-[0.04em] text-ink outline-none placeholder:tracking-[0.14em] placeholder:text-muted focus:bg-soft/40"
      />
      {state.error && <p className="text-sm font-bold text-coral">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Deleting…" : "Delete permanently"}
        </Button>
      </div>
    </form>
  );
}
