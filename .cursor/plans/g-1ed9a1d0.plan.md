<!-- 1ed9a1d0-8bd0-40e1-9f10-03678b3028c6 3e9f9de4-353e-4f8d-bf1d-77f0c030ce80 -->
# Habit Tracker – Gap Review and Tech Stack Lock (Vercel serverless, simplified, no observability/SLO)

## Scope

Web-only, mobile-first, dark-mode. Clerk auth (Discord). Neon Postgres. No notifications/integrations. Focus on habits, check-ins, streaks, freezes, analytics, exports. No background workers, no Sentry, no R2, remove testing for now.

## Key decisions (updated)

### Recurrence & streaks

- X/week uses user `week_start` (Mon/Sun). Target met if `sum(quantity) ≥ count_target` within week; `allowed_days` narrows expected days.
- X/month uses calendar month.
- Daily habits streak = consecutive local days meeting expectation (skip/freeze preserve).
- Weekly/monthly show period “on-track streak” (consecutive periods meeting target).

### Skips & freezes (lazy updates)

- Skip: neutral; one per `habit_id + local_day`; cannot coexist with completion.
- Freeze tokens: +1 per user per week, no expiry, soft cap 5.
- No cron/worker: On `GET /api/user/counters` or `GET /api/freezes`, compute grants lazily:
- If `now - last_freeze_grant_at ≥ 7d`, increment `freeze_tokens_available` by floor(weeks elapsed) up to cap, update `last_freeze_grant_at`.
- Optionally append rows to `freeze_tokens` for audit with `granted_at`.
- Retroactive freeze allowed within 7 days by specifying `covered_local_day`.

### Day-boundary & timezone

- Persist `occurred_at` (UTC) and `local_day` at write time using user tz and boundary. Historical rows are immutable; caches recomputed only going forward.

### Idempotency

- Support `Idempotency-Key` on POST/PATCH to avoid duplicates. Partial uniques for binary/skip as guardrails.

### Analytics (no workers)

- On write: compute and upsert minimal `streaks_cache` synchronously for the affected habit using a small window. Keep computations fast; defer heavy analytics.
- On read (analytics endpoints): compute aggregates on-the-fly for the requested range (heatmap, completion rate, strength EWMA) with SQL queries; add simple in-DB caching later if needed.

### Rate limiting (minimal)

- Use a lightweight Postgres-based per-user sliding window limiter (table `rate_limits`), enforced in route handlers. Can be disabled in dev.

## Data model refinements

- `freeze_tokens`: add `covered_local_day date` (required when used), `covered_habit_id uuid REFERENCES habits(id)`.
- `users`: add `week_start enum('mon','sun') DEFAULT 'mon'`.
- `checkins`: partial uniques (binary and skip). CHECK `NOT (is_skip AND quantity>0)`.
- `user_counters`: `freeze_tokens_available`, `last_freeze_grant_at` (used by lazy grant).
- Optional `rate_limits` table: `user_id`, `bucket`, `window_start`, `count`.

## Concrete tech stack (Vercel serverless only)

- Framework: Next.js 14 (App Router) on Vercel; TypeScript; React 18; Tailwind (dark-mode); Radix UI; TanStack Query; Clerk Next.js; date-fns-tz; Recharts.
- APIs: Next.js Route Handlers in `app/api/*/route.ts` + Server Actions. Use Node runtime for DB access (`export const runtime = 'nodejs'`).
- Auth: Clerk middleware (`middleware.ts`), `auth()`/`currentUser()` on server.
- Database: Neon Postgres via Drizzle ORM with `@neondatabase/serverless` (HTTP). Migrations with `drizzle-kit`.
- Storage: None for now. CSV exports are streamed directly in the HTTP response.
- Observability (minimal): Vercel logs; structured logs with request IDs. No Sentry for now.
- Hosting: Everything in a single Vercel project (UI + API routes).

## Minimal API surface (unchanged)

- `GET /api/habits`, `POST /api/habits`, `GET /api/habits/:id`, `PATCH /api/habits/:id`
- `POST /api/habits/:id/checkins`, `GET /api/habits/:id/checkins?start=&end=`
- `POST /api/habits/:id/skip`
- `POST /api/freezes/activate`
- `GET /api/user/counters` (triggers lazy freeze grant), `GET /api/freezes` (optional detail; also triggers grant)
- `GET /api/analytics/habits/:id/daily?start=&end=` (computed on demand)
- `GET /api/exports/habits/:id?start=&end=&format=csv` (streams CSV)
- `GET /api/profile`, `PATCH /api/profile`
- Admin/observability: `GET /api/events` (optional; for audit only)

## Observability & SLOs (what and whether now)

- Observability = ability to understand prod behavior via logs/metrics/traces. Minimal now: structured server logs (route, user id, duration, status) viewable in Vercel.
- SLO (Service Level Objective) = target for reliability/latency (e.g., p95 latency < 500ms). Useful for teams and growth, but not necessary for an MCP. We’ll skip formal SLOs now and rely on Vercel logs; we can add metrics and alerts later when scale warrants it.

## Implementation notes

- Keep all DB work in Node runtime handlers (avoid Edge for DB).
- Ensure idempotency and partial uniques prevent double-taps on binary/skip.
- Freeze lazy grant must be transactional with counters to avoid race conditions.
- Exports: stream CSV directly; keep queries efficient and paged for large ranges.

## Implementation todos

- setup-next-vercel: Next.js app, Tailwind dark theme, envs, README
- auth-middleware: Clerk middleware + server helpers
- schema-drizzle: Drizzle schema/enums/indexes and migrations
- routes-core: Implement habits/checkins/skips/profile/analytics/export route handlers
- freeze-lazy-grant: Implement lazy weekly grant on `GET /api/user/counters` and `/api/freezes`
- rate-limit-basic: Implement Postgres-based per-user limiter in routes
- frontend-screens: Today, Habit detail, Create/Edit, Analytics, Profile
- logs-basic: Structured logging with request IDs (Vercel console)