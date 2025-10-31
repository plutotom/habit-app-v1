import Link from "next/link";

import { requireCurrentAppUser } from "@/lib/users";
import { UserButton } from "@clerk/nextjs";

const navLinks = [
  { href: "/app/today", label: "Today" },
  { href: "/app/habits/new", label: "New Habit" },
  { href: "/app/analytics", label: "Analytics" },
  { href: "/app/profile", label: "Profile" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentAppUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-accent">Habit Tracker</span>
            <span className="hidden text-sm text-muted sm:inline">· {user.timezone}</span>
          </div>
          <nav className="flex items-center gap-3 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1 transition hover:bg-card/70"
              >
                {link.label}
              </Link>
            ))}
            <UserButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}

