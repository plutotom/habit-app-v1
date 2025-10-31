"use client";

import React from "react";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";

type LoadingLinkCardProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  overlayLabel?: string;
};

export function LoadingLinkCard({ href, className, children, overlayLabel = "Loading" }: LoadingLinkCardProps) {
  const [pending, setPending] = React.useState(false);

  return (
    <Link
      href={href}
      onClick={() => setPending(true)}
      className={(className ? className + " " : "") + "relative"}
      aria-busy={pending || undefined}
    >
      {children}
      {pending ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/60">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Spinner />
            <span>{overlayLabel}</span>
          </div>
        </div>
      ) : null}
    </Link>
  );
}

export default LoadingLinkCard;



