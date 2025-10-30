## Habit Tracker (Next.js 14 + Vercel)

Mobile-first, dark-mode-only habit tracker that runs entirely on Vercel Serverless. Auth is provided by Clerk, data lives in Neon Postgres, and all analytics are computed on-demand without background workers.

### Stack

- Next.js 14 App Router · React 19 · TypeScript
- Tailwind CSS 4 with custom dark theme tokens
- Drizzle ORM targeting Neon Postgres (HTTP driver)
- Clerk for Discord OAuth

### Prerequisites

- Node.js 20+
- pnpm 9+
- Neon Postgres database & Clerk application

### Environment variables

Copy `.env.example` to `.env.local` and provide real credentials:

```bash
cp .env.example .env.local
```

### Install & develop

```bash
pnpm install
pnpm dev
```

The app runs at http://localhost:3000. Tailwind and the App Router provide hot reload out of the box.

### Database (Drizzle + Neon)

```bash
pnpm db:generate   # generate SQL from schema
pnpm db:migrate    # run generated migrations against DATABASE_URL
```

`drizzle.config.ts` uses `DATABASE_URL` from `.env.local` to connect to Neon.

### Linting

```bash
pnpm lint
```

### Deployment

Configure the same environment variables inside Vercel. The project is designed to live in a single Vercel deployment (UI + API routes). Neon and Clerk secrets are required for production.
