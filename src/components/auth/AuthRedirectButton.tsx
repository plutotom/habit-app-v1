"use client";

import { getSignInUrl, getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { type ReactNode, useState } from "react";

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
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;

    setLoading(true);
    try {
      const redirectUri = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
      const url =
        mode === "sign-in"
          ? await getSignInUrl({ redirectUri })
          : await getSignUpUrl({ redirectUri });
      window.location.href = url;
    } catch (error) {
      console.error(`Failed to start ${mode}:`, error);
      setLoading(false);
    }
  }

  return (
    <button type="button" className={className} onClick={handleClick} disabled={loading}>
      {loading ? "Redirecting…" : children}
    </button>
  );
}
