import Link from "next/link";
import { type ReactNode } from "react";

type AuthRedirectButtonProps = {
  mode: "sign-in" | "sign-up";
  className?: string;
  children: ReactNode;
};

export function AuthRedirectButton({
  mode,
  className,
  children,
}: AuthRedirectButtonProps) {
  const href = mode === "sign-in" ? "/sign-in" : "/sign-up";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
