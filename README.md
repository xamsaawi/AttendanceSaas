# Attendance SaaS

A multi-tenant attendance tracking application built with Next.js (App Router), Supabase, and shadcn/ui.

## Tech stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **UI:** Tailwind CSS v4, shadcn/ui (Base UI primitives)
- **Data & Auth:** Supabase (Postgres, Auth, Row Level Security)
- **Server state:** TanStack Query
- **Forms:** react-hook-form + zod
- **Theming:** next-themes (light/dark)
- **PWA:** Serwist (service worker, offline fallback)
- **Package manager:** pnpm

## Getting started

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm` if you don't have it)
- A [Supabase](https://supabase.com) project (free tier is fine)

### Setup

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase project's URL and keys (Project Settings → API).

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

SQL migrations live in `supabase/migrations/`. With the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and linked to your project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

To generate TypeScript types from your live schema:

```bash
supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

## Scripts

| Script                | Description                            |
| ---------------------- | --------------------------------------- |
| `pnpm dev`              | Start the dev server                    |
| `pnpm build`            | Production build                        |
| `pnpm start`            | Start the production server             |
| `pnpm lint`             | Run ESLint                              |
| `pnpm typecheck`        | Run the TypeScript compiler (no emit)   |
| `pnpm format`           | Format the codebase with Prettier       |
| `pnpm format:check`     | Check formatting without writing        |
| `pnpm icons:generate`   | Regenerate placeholder PWA icons        |
| `pnpm test:e2e`         | Run the Playwright smoke suite (see below) |

## Project structure

```
src/
  app/                 App Router routes
    (auth)/            Login, register, forgot-password (public)
    (dashboard)/       Authenticated app shell
    api/               Route handlers
  components/
    ui/                shadcn/ui primitives
    layout/            Navbar, Sidebar, Footer
    shared/            Reusable app-wide components
    providers/         Theme, TanStack Query, PWA providers
  features/            Feature-scoped logic (e.g. auth/)
  lib/
    supabase/          Browser/server/middleware Supabase clients
    validations/       zod schemas
    errors/             App error types
    logger.ts           Structured logger
  config/              Env vars, navigation config
  types/               Shared TypeScript types (incl. generated DB types)
supabase/
  migrations/          SQL migrations
  config.toml          Local Supabase CLI config
```

## Testing

`e2e/` has a Playwright smoke suite covering login, marking attendance, generating/exporting a report, and cross-org RLS isolation. It runs against a real dev server and a real (linked) Supabase project, so it needs seeded test data first:

```bash
node --env-file=.env.local scripts/seed-e2e.mjs
pnpm test:e2e
```

This isn't wired into CI — CI has no live Supabase credentials or seed data, and setting that up safely is a separate infra task. Run it locally before a release.

## Deployment

This project deploys to [Vercel](https://vercel.com). See [docs/deployment.md](docs/deployment.md) for step-by-step instructions, required environment variables, and the production checklist. See [docs/backup-recovery.md](docs/backup-recovery.md) for the backup/restore runbook.
