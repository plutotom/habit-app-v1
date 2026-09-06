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

## Release (iOS)

One-time: `pnpm exec eas init` from the repo root, then fill `.env.mobile.production`.

- `pnpm ota:production` — Convex prod deploy + EAS Update
- `pnpm build:ios:production` — bump version, local EAS iOS build
- `pnpm release:ios:production` — submit `.ipa` to Apple + matching OTA
