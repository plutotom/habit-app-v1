# Habits app — agent guide

## Active app (guest-first offline)

- **Data:** `src/local/` — Expo SQLite (`habit-local-v1.db`)
- **Providers:** `LocalDatabaseProvider` only (`src/providers/app-providers.tsx`)
- **Routes:** `app/(app)/` — no auth gate; `app/index.tsx` redirects to `/today`
- **Reminders:** `src/lib/habit-reminders.ts` + `HabitReminderCleanup` (uses local habits)

Do **not** add `ConvexProvider`, `AuthProvider`, Convex hooks, or `useAuth` to
`app/` or live UI under `src/components/`.

## Future sync slice (not wired into the app)

- `backend/` — Convex functions (see `backend/README.md`)
- `src/sync/` — WorkOS auth + Convex account bootstrap (see `src/sync/README.md`)

Do not import `src/sync/` from active screens. Do not treat Convex as the live
backend for UI work.

## Development

- `pnpm dev` / `pnpm dev:ios` — Expo only; no backend env required
- `pnpm dev:backend` — Convex dev (sync work only)
- `pnpm test` — app/local tests in `tests/` (includes architecture + startup smoke)
- `pnpm test:backend` / `pnpm test:sync` — retained backend and auth tests
- `pnpm verify:ship` — run before distributing builds (lint, types, app tests, sync tests, Expo Doctor)

## Local SQLite migrations

Read `docs/local-migrations.md` before changing `src/local/database.ts`.
When bumping `LOCAL_DATABASE_VERSION`, add an upgrade path and a test that seeds
**existing** data (see `tests/fixtures/seed-v1-database.ts`), not only a fresh DB.

<!-- convex-ai-start -->

When editing **`backend/`** only, this project uses [Convex](https://convex.dev).

Read `backend/_generated/ai/guidelines.md` first. Convex agent skills:

```bash
npx convex ai-files install
```

<!-- convex-ai-end -->
