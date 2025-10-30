import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-surface text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-6 py-16 sm:px-10 sm:py-24">
        <header className="flex flex-col gap-6">
          <span className="w-fit rounded-full border border-border bg-card/60 px-4 py-1 text-sm font-medium text-muted">
            Habit Tracker · Neon + Clerk · Dark mode only
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Stay consistent with flexible schedules, streak freezes, and
            real-time analytics.
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            Design your routine, log check-ins from any device, and see immediate
            insights on streaks, strength, and completion trends. Built for
            mobile-first usage on Vercel with Neon Postgres.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="#getting-started"
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-2 text-sm font-semibold text-background transition hover:opacity-90"
            >
              View implementation plan
            </Link>
            <Link
              href="https://neon.tech"
              target="_blank"
              className="inline-flex items-center justify-center rounded-full border border-border px-6 py-2 text-sm font-semibold text-foreground transition hover:bg-card/60"
            >
              Neon Postgres
            </Link>
          </div>
        </header>

        <section className="grid gap-6 sm:grid-cols-2" id="getting-started">
          <article className="rounded-2xl border border-border bg-card/70 p-6 shadow-lg shadow-black/20">
            <h2 className="text-xl font-semibold">Core tracking</h2>
            <p className="mt-3 text-sm text-muted">
              Daily, weekly, monthly, or custom targets with binary, numeric, or
              duration-based check-ins. Late-night routines respect personalized
              day boundaries.
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-card/70 p-6 shadow-lg shadow-black/20">
            <h2 className="text-xl font-semibold">Freeze tokens</h2>
            <p className="mt-3 text-sm text-muted">
              Earn one freeze every week automatically when viewing your
              counters. Apply within seven days to preserve streaks on missed
              days.
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-card/70 p-6 shadow-lg shadow-black/20">
            <h2 className="text-xl font-semibold">Analytics on demand</h2>
            <p className="mt-3 text-sm text-muted">
              Daily completion rates, streak history, and habit-strength scores
              are calculated live from Neon without background workers.
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-card/70 p-6 shadow-lg shadow-black/20">
            <h2 className="text-xl font-semibold">Privacy-first exports</h2>
            <p className="mt-3 text-sm text-muted">
              Generate CSV exports straight from API routes. Data stays in Postgres
              and your browser—no additional storage required yet.
            </p>
          </article>
        </section>

        <footer className="rounded-2xl border border-border bg-card/70 p-6">
          <h2 className="text-lg font-semibold">Next steps</h2>
          <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <li>• Configure Clerk for Discord SSO</li>
            <li>• Implement habit and check-in schemas with Drizzle</li>
            <li>• Build mobile-first Today and Habit Detail screens</li>
            <li>• Streamline analytics queries for heatmaps and trends</li>
          </ul>
        </footer>
      </div>
    </main>
  );
}
