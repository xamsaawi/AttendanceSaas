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

4. Deploy. Every push to `main` triggers a production deployment; every PR gets a preview deployment.
5. In Supabase → Authentication → URL Configuration, add your Vercel production and preview URLs to the allowed redirect URLs so `/auth/callback` works.

## CI

`.github/workflows/ci.yml` runs lint, typecheck, and build on every push and pull request against `main`. Vercel deployments are independent of this workflow — CI is a merge gate, not the deploy trigger.

## Local CLI deployment (optional)

If you prefer deploying from the command line instead of the Git integration:

```bash
pnpm dlx vercel login
pnpm dlx vercel link
pnpm dlx vercel --prod
```
