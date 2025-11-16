"use client";

import React from "react";
import SubmitButton from "@/components/ui/SubmitButton";
import Button from "@/components/ui/Button";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  trackType: "binary" | "count" | "duration" | "timer";
  completedToday: boolean;
  defaultQuantity?: number;
};

export default function CheckinControls({ action, trackType, completedToday, defaultQuantity = 1 }: Props) {
  const quantityRef = React.useRef<HTMLInputElement | null>(null);

  const increment = (amount: number) => {
    if (!quantityRef.current) return;
    const current = Number(quantityRef.current.value || 0);
    const next = Math.max(0, current + amount);
    quantityRef.current.value = String(next);
  };

  if (trackType === "binary") {
    return (
      <form action={action} className="flex items-center gap-3">
        <SubmitButton variant="primary" pendingText={completedToday ? "Saving..." : "Saving..."} disabled={completedToday}>
          {completedToday ? "Completed" : "Mark complete"}
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          name="quantity"
          type="number"
          min={0}
          defaultValue={defaultQuantity}
          ref={quantityRef}
          className="w-28 rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => increment(1)}>
          +1
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => increment(defaultQuantity)}>
          +{defaultQuantity}
        </Button>
        <div className="ml-auto">
          <SubmitButton variant="primary" pendingText="Saving...">
            Log
          </SubmitButton>
        </div>
      </div>
      <label className="flex flex-col gap-2 text-xs">
        Note (optional)
        <textarea
          name="note"
          rows={2}
          placeholder="Add a short note"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
    </form>
  );
}


