"use client";

import { useTransition } from "react";
import { resendNotification } from "@/infra/notify/actions";

export function ResendButton({ id, label, pendingLabel }: { id: string; label: string; pendingLabel: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => void (await resendNotification(id)))}
      className="bg-char-900 text-bone-50 min-h-11 rounded-lg px-4 text-sm font-medium disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
