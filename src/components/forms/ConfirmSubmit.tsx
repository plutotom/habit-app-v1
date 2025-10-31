"use client";

import React from "react";
import SubmitButton from "@/components/ui/SubmitButton";

type ConfirmSubmitProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  message: string;
  pendingText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export default function ConfirmSubmit({ action, children, message, pendingText, variant = "primary" }: ConfirmSubmitProps) {
  const handleSubmit = React.useCallback((e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm(message)) {
      e.preventDefault();
    }
  }, [message]);

  return (
    <form action={action} onSubmit={handleSubmit}>
      <SubmitButton variant={variant} pendingText={pendingText}>
        {children}
      </SubmitButton>
    </form>
  );
}


