# Habits app

See [AGENTS.md](./AGENTS.md) for architecture and development guidance.

The guest-first offline app uses `src/local/` (SQLite). Convex and WorkOS code
live in `backend/` and `src/sync/` for a future sync slice and are not wired
into the active app.
