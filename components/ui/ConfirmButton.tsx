"use client";

import { useState } from "react";
import { Button } from "./Button";

/**
 * Two-step destructive action: first click arms it, second click fires.
 * Swiss-flat alternative to a confirm modal.
 */
export function ConfirmButton({
  onConfirm,
  label,
  confirmLabel = "Click again to confirm",
}: {
  onConfirm: () => Promise<void> | void;
  label: string;
  confirmLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="danger"
      disabled={busy}
      onBlur={() => setArmed(false)}
      onClick={async () => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
          setArmed(false);
        }
      }}
    >
      {busy ? "Deleting…" : armed ? confirmLabel : label}
    </Button>
  );
}
