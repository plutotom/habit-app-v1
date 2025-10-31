"use client";

import React from "react";
import Spinner from "@/components/ui/Spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
};

function joinClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-background hover:opacity-90",
  secondary:
    "border border-border text-foreground hover:border-accent hover:text-accent bg-transparent",
  ghost: "text-foreground hover:bg-surface",
  danger: "bg-red-600 text-white hover:opacity-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading = false, fullWidth, className, children, disabled, ...rest },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={joinClassNames(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? "w-full" : undefined,
          className,
        )}
        {...rest}
      >
        {loading ? <Spinner /> : null}
        <span>{children}</span>
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;



