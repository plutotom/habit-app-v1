import Link from "next/link";

const features = [
  {
    title: "Flexible schedules",
    body: "Daily, weekly, monthly, or custom cadence with binary, count, duration, and timer check-ins—all respecting personalized day boundaries.",
  },
  {
    title: "Freeze streaks",
    body: "Automatic weekly freeze tokens let you cushion unexpected misses without losing momentum.",
  },
  {
    title: "Instant analytics",
    body: "Heatmaps, habit strength, and completion trends are computed on-demand directly from Neon Postgres.",
  },
  {
    title: "Private exports",
    body: "Generate CSV snapshots from the API when you need them—no extra storage or background jobs required.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-surface text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-6 py-16 sm:px-10 sm:py-24">
        <header className="flex flex-col gap-6">
          <span className="w-fit rounded-full border border-border bg-card/60 px-4 py-1 text-sm font-medium text-muted">
            Habit Tracker · Built for Vercel + Neon
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Track habits effortlessly and keep your streaks alive.
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            Sign in with Discord via Clerk, create routines that match your rhythm, and monitor
            progress from any device in a dark-mode interface optimized for mobile use.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-2 text-sm font-semibold text-background transition hover:opacity-90"
            >
              Sign in to start tracking
            </Link>
            <Link
              href="/app/today"
              className="inline-flex items-center justify-center rounded-full border border-border px-6 py-2 text-sm font-semibold text-foreground transition hover:bg-card/60"
            >
              View app preview
            </Link>
          </div>
        </header>

        <section className="grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-border bg-card/70 p-6 shadow-lg shadow-black/20"
            >
              <h2 className="text-xl font-semibold">{feature.title}</h2>
              <p className="mt-3 text-sm text-muted">{feature.body}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card/70 p-6">
          <h2 className="text-lg font-semibold">How to try it</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted">
            <li>1. Sign in with Discord using the button above.</li>
            <li>2. Create a habit from `/app/habits/new` and tailor its schedule.</li>
            <li>3. Log check-ins from the Today view and watch streaks, freezes, and analytics update instantly.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
