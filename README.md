# Habits

iOS habit tracker with hold-to-complete check-ins, streaks, daily and weekday
schedules, and offline reminders.

## Current offline slice

The active app is guest-first and stores habits, check-ins, preferences, and a
future-sync outbox in `habit-local-v1.db` through Expo SQLite. Core use does not
require a Convex URL, a WorkOS session, or a network connection. The retained
Convex and authentication sources are reserved for the account-import and sync
slice.

> **Release gate:** do not distribute this branch to existing production users.
> It deliberately does not import their existing Convex records. Account
> bootstrap, guest/account merge decisions, and sync must ship before release.

The previous Next.js web app is archived on the `archive/next-web` branch.

## Stack

- Expo · React Native · TypeScript
- Expo SQLite for the active local data path
- Expo Notifications and AsyncStorage for per-habit reminders
- Convex and WorkOS sources retained for the upcoming sync slice

## Develop

Prerequisites are Node.js 20+, pnpm 10+, Xcode, and an iOS Simulator.

```bash
pnpm install
pnpm ios
```

`expo-sqlite` is a native dependency, so create a new development build after
checking out this slice. Backend configuration is not required for offline use.

- `pnpm dev:ios` — start Expo for an existing development build
- `pnpm lint` — ESLint
- `pnpm format` — Prettier
- `pnpm typecheck` — frontend and retained backend TypeScript
- `pnpm test` — migration, repository, date, UI, and retained auth tests
- `pnpm verify` — lint, types, tests, and Expo Doctor

Use the pinned pnpm version (`corepack enable`, or `npx pnpm@10.12.1`).

## Release

Production release commands remain in the repository for a later slice, but
must not be run from this branch. See the release gate above.
