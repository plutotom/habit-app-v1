# Future sync slice (not wired into the app)

WorkOS sign-in and Convex account bootstrap for the upcoming account-import
and sync work. **Do not import these modules from `app/` or live UI
components.** The guest-first app uses `src/local/` only.

When sync ships, wire `AuthProvider`, `ConvexProvider`, and `UserBootstrap`
into `src/providers/app-providers.tsx` and restore the sign-in route.
