"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { Button, ButtonProps } from "@/components/ui/Button";

type SubmitButtonProps = Omit<ButtonProps, "type"> & {
  pendingText?: string;
};

export function SubmitButton({ children, pendingText, ...rest }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} aria-live="polite" {...rest}>
      {pending ? pendingText ?? String(children) : children}
    </Button>
  );
}

export default SubmitButton;



