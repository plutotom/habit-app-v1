"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/today",
    label: "Home",
    icon: (active: boolean) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
      </svg>
    ),
    match: (path: string) => path === "/today" || path === "/",
  },
  {
    href: "/habits/new",
    label: "New",
    icon: (active: boolean) => (
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
          active ? "bg-foreground text-background" : "bg-foreground text-background"
        }`}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
    ),
    match: (path: string) => path.startsWith("/habits/new"),
    prominent: true,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (active: boolean) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20c0-4 3.5-7 7-7s7 3 7 7" />
      </svg>
    ),
    match: (path: string) => path === "/profile",
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.includes("/completed")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-lg">
      <div
        className="mx-auto flex max-w-xl items-end justify-around px-6 pt-2"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);

          if ("prominent" in item && item.prominent) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="-mt-5 flex flex-col items-center gap-1"
                aria-label={item.label}
              >
                {item.icon(active)}
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 pb-1 transition-colors ${
                active ? "text-foreground" : "text-muted"
              }`}
            >
              {item.icon(active)}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
