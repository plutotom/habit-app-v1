# Habits

iOS habit tracker. Hold-to-complete check-ins, streaks, and a simple schedule (daily or specific weekdays).

The previous Next.js web app is archived on the `archive/next-web` branch.

## Stack

- Expo (dev client) · React Native · TypeScript
- [Convex](https://convex.dev) for the backend and realtime data
- [WorkOS AuthKit](https://workos.com/authkit) via native PKCE (no Next.js)

## Prerequisites

- Node.js 20+
- pnpm 10+
- Xcode + iOS Simulator
- A Convex project (`npx convex login` then `npx convex dev`)
- A WorkOS application with AuthKit enabled and redirect URI `habits://callback`

## Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

## Develop

```bash
pnpm install
pnpm ios
```

That builds a native dev client (required for WorkOS PKCE + custom URL scheme) and opens the iOS Simulator.

- `pnpm dev` — Convex + Expo bundler (after the first `pnpm ios`)
- `pnpm lint` — ESLint
- `pnpm format` — Prettier
- `pnpm typecheck` — TypeScript
- `pnpm test` — regression tests for authentication, check-ins, dates, and statistics
- `pnpm verify` — lint, frontend/backend types, tests, and Expo Doctor

Use the pinned pnpm version (`corepack enable`, or `npx pnpm@10.12.1`). CI also
exports the iOS bundle. Before shipping a native release, verify sign-in,
completion/undo, background/resume, and expired-session recovery on an iPhone.

Existing check-ins are preserved. When an older habit is opened, its lifetime
statistics are backfilled in resumable batches into yearly summaries. Statistics
show a loading indicator until complete; new completions and undos update the
summaries in the same transaction. History screens intentionally show recent
records, while totals and streaks use the full summary.

## Release (iOS)

One-time: `pnpm dlx eas-cli@16.28.0 init` from the repo root, then fill `.env.mobile.production`.

This app is iOS-only. OTA updates publish to the `production` channel for runtime version `app.json` → `expo.version` (via `runtimeVersion.policy: appVersion`). Users on that native version receive JS updates on next launch.

- `pnpm ota:production` — Convex prod deploy + iOS EAS Update
- `pnpm build:ios:production` — bump version, local EAS iOS build
- `pnpm release:ios:production` — submit `.ipa` to Apple + matching iOS OTA

JS-only hotfix (no new native build): `SKIP_CONVEX_DEPLOY=1 pnpm ota:production -- "describe the fix"`
