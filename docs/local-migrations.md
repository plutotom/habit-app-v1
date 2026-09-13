# Local SQLite migrations

The guest-first app stores data in `habit-local-v1.db`. Schema version is tracked
with SQLite `PRAGMA user_version` (`LOCAL_DATABASE_VERSION` in
`src/local/database.ts`).

## Before every release that touches storage

1. **Bump `LOCAL_DATABASE_VERSION`** when the on-device schema changes.
2. **Add an upgrade path** from the previous version. Never only run
   `CREATE TABLE` on an existing install.
3. **Add tests** in `tests/local-database.test.ts`:
   - fresh install creates the new schema
   - reopen at the current version does not rerun migration
   - **existing user data survives** — seed with `tests/fixtures/seed-v1-database.ts`
     (or the previous version fixture) and assert habits/checkins/preferences remain
   - newer DB version fails with a clear message
   - failed migration rolls back
4. **Run `pnpm verify:ship`** before distributing a build.

Fresh-database tests alone are not enough. Most real users already have v1 data
on disk.

## Fixture pattern

```ts
import { seedV1DatabaseWithSampleHabit } from "./fixtures/seed-v1-database";

const database = createDatabase();
const seeded = await seedV1DatabaseWithSampleHabit(database);
// apply v1 -> v2 migration here when it exists
await initializeLocalDatabase(database);
// assert seeded.habitId still reads back correctly
```

When adding v2, create `tests/fixtures/seed-v2-database.ts` and a test that opens
a v1 fixture, migrates, and preserves data.

## Live app guardrails

- `tests/architecture.test.ts` — live `app/` and `src/` must not import Convex
  or `src/sync/`
- `tests/startup.test.tsx` — root layout mounts without provider crashes
- ESLint `no-restricted-imports` on the live app tree
