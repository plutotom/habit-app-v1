import Link from "next/link";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { UserBootstrap } from "@/components/app/UserBootstrap";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await withAuth();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-4">
          <Link href="/today" className="font-semibold tracking-tight">
            Habits
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/today" className="hover:text-foreground transition-colors">
              Today
            </Link>
            <Link href="/profile" className="hover:text-foreground transition-colors">
              Profile
            </Link>
            <Link
              href="/sign-out"
              className="hover:text-foreground transition-colors"
            >
              Sign out
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background">
        <div className="mx-auto flex max-w-xl justify-around py-3">
          <Link
            href="/today"
            className="flex flex-col items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
          >
            <span className="text-xl">✓</span>
            Today
          </Link>
          <Link
            href="/habits/new"
            className="flex flex-col items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
          >
            <span className="text-xl">+</span>
            New
          </Link>
          <Link
            href="/profile"
            className="flex flex-col items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
          >
            <span className="text-xl">○</span>
            Profile
          </Link>
        </div>
      </nav>

      <UserBootstrap email={user?.email} />
    </div>
  );
}
