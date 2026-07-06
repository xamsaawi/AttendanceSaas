# Deployment

## Vercel

1. Import the GitHub repository at [vercel.com/new](https://vercel.com/new).
2. Vercel auto-detects Next.js; `vercel.json` in the repo root pins the build/install commands to pnpm.
3. Add the following environment variables in **Project Settings → Environment Variables** (Production, Preview, and Development as needed):

   | Variable                       | Where to find it                                  |
   | -------------------------------- | ---------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`       | Supabase → Project Settings → API → Project URL       |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase → Project Settings → API → anon public key   |
   | `SUPABASE_SERVICE_ROLE_KEY`      | Supabase → Project Settings → API → service_role key  |
   | `NEXT_PUBLIC_SITE_URL`           | Your production URL, e.g. `https://app.example.com`   |
   | `NEXT_PUBLIC_APP_NAME`           | Optional, defaults to "Attendance SaaS"                |
   | `CRON_SECRET`                    | Generate with `openssl rand -hex 32`; also required for Vercel Cron to authenticate `/api/cron/daily-report` (see below) |

4. Deploy. Every push to `main` triggers a production deployment; every PR gets a preview deployment.
5. In Supabase → Authentication → URL Configuration, add your Vercel production and preview URLs to the allowed redirect URLs so `/auth/callback` works.
6. Vercel Cron (configured in `vercel.json`) calls `/api/cron/daily-report` daily; it sends `Authorization: Bearer $CRON_SECRET` automatically once `CRON_SECRET` is set as a project env var. The route returns 401 without it — that's intentional (see `src/app/api/cron/daily-report/route.ts`).

## Production checklist

Run through this before/after cutting a release:

- [ ] `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm audit --prod` all clean locally.
- [ ] All files in `supabase/migrations/` are applied to the linked project — check via `pnpm dlx supabase migration list --linked` (needs `supabase login` once) or by diffing against Supabase Studio's migration history. As of this writing the newest is `20260705030000_storage_upload_limits.sql`.
- [ ] Vercel project env vars match `.env.example` exactly (including `CRON_SECRET`) across Production/Preview.
- [ ] Supabase Auth redirect URLs include the current production Vercel URL.
- [ ] `/api/health` returns 200 on the production deployment.

## Known gaps / follow-ups

- **No distributed rate limiting** on API routes (import/export/attendance-mark). A proper implementation needs shared state (e.g. Upstash Redis) since Vercel functions are stateless across instances — an in-memory limiter would give a false sense of safety. Until that's built, turn on **Vercel Firewall → Attack Challenge Mode** (Project Settings → Firewall) for cheap, code-free abuse protection.
- **Content-Security-Policy** (`next.config.ts`) currently allows `'unsafe-inline'`/`'unsafe-eval'` on `script-src` because Next's hydration bootstrap isn't nonce-wired. Tightening this to a nonce-based CSP is a good follow-up but needs end-to-end testing across every page before shipping.

## CI

`.github/workflows/ci.yml` runs lint, typecheck, and build on every push and pull request against `main`. Vercel deployments are independent of this workflow — CI is a merge gate, not the deploy trigger.

## Local CLI deployment (optional)

If you prefer deploying from the command line instead of the Git integration:

```bash
pnpm dlx vercel login
pnpm dlx vercel link
pnpm dlx vercel --prod
```
