# Habits

Mobile-first habit tracker. Hold-to-complete check-ins, streaks, and a simple schedule (daily or specific weekdays).

Not a production app — a POC to build on.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4
- [Convex](https://convex.dev) for the backend and realtime data
- [WorkOS AuthKit](https://workos.com/authkit) for auth

## Prerequisites

- Node.js 20+
- pnpm 9+
- A Convex project (`npx convex login` then `npx convex dev`)
- A WorkOS application with AuthKit enabled

## Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

`pnpm dev` also writes Convex + AuthKit local values via `convex.json`.

## Develop

```bash
pnpm install
pnpm dev
```

App: http://localhost:4021

- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript

## What’s in the app

- Sign in / sign up (WorkOS)
- Today: week strip, hold 3s to complete, undo
- Habit detail: streak, 35-day heatmap, history
- Create / edit / archive habits (daily or specific days)
- Profile: timezone and week-start (Mon/Sun)
