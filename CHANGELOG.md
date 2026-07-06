# Changelog

## v1.0.0 — Production readiness

- Playwright E2E smoke suite covering login, attendance marking, report export, and cross-org RLS isolation.
- Security headers (CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) added in `next.config.ts`.
- Server-side mime-type/size validation on all image uploads (school logo, student/teacher photos), backed by matching Supabase storage bucket limits.
- Fixed 2 moderate transitive dependency vulnerabilities (`postcss`, `uuid`) via `pnpm-workspace.yaml` overrides.
- Mobile navigation: the dashboard sidebar had no small-screen equivalent — added a hamburger-triggered `Sheet` drawer.
- Accessibility: skip-to-content link, `aria-label` on icon-only buttons that were missing one.
- Documentation: `CRON_SECRET` documented in `.env.example`/deployment docs, production checklist, backup & recovery runbook.

## Step 5 — Reports & communication

Analytics dashboards, WhatsApp share links for attendance/reports, in-app notifications (incl. a daily cron-driven summary), audit log.

## Step 4 — Attendance system

Attendance sessions, marking UI, lock windows, offline queue + replay, realtime sync.

## Step 3 — Core school management

Student/teacher/parent/class CRUD, grades & sections, profile photos, bulk Excel import/export, global search (⌘K).

## Step 2 — School domain & security

Organizations-as-schools, school settings, academic years/terms/holidays, RLS policies, role model (owner/admin/teacher), teacher invites.

## Step 1 — Foundation

Next.js 16 (App Router) + Supabase + shadcn/ui + PWA scaffold, auth pages, dashboard shell.
