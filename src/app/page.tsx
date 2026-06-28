export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex max-w-md flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            Build better habits.
          </h1>
          <p className="text-muted text-lg">
            Simple, real-time habit tracking. Log check-ins, watch streaks grow,
            and stay consistent.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Sign in
          </a>
          <a
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-card"
          >
            Create account
          </a>
        </div>
      </div>
    </main>
  );
}
