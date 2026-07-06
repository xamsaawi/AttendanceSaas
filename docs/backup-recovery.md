# Backup & recovery

This project runs on Supabase's **Free tier**, which has no point-in-time recovery (PITR) — only manual backups you trigger yourself. If the database or storage is corrupted or deleted, the only way back is from a backup you took ahead of time.

## What to back up

1. **Database** (schema + rows) — everything in `organizations`, `students`, `attendance_sessions`, etc.
2. **Storage buckets** — `school-logos` and `profile-photos` (photos aren't in the database, only their storage paths are).

## Taking a manual backup

Run this on a schedule you're comfortable with (weekly is reasonable for a small school's data) — there's no automation for this on the Free tier, so it's a manual step or a cron job you set up yourself.

### Database dump

```bash
pnpm dlx supabase db dump --linked -f backup-$(date +%Y%m%d).sql
```

This requires `supabase login` once (needs a browser) and the project already linked (`supabase link --project-ref <your-project-ref>`, found in Supabase → Project Settings → General). Store the resulting `.sql` file somewhere durable (not in this repo) — e.g. a private cloud storage bucket or encrypted local archive.

Alternatively, from the Supabase dashboard: **Database → Backups** shows Supabase's own daily backups, but on the Free tier these are only retained for a short window and aren't restorable via the dashboard — treat the manual `db dump` above as the real backup, not the dashboard's automatic snapshot.

### Storage buckets

The Supabase CLI doesn't bulk-export storage objects. Use the Storage API to list and download objects per bucket:

```bash
node --env-file=.env.local -e "
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  for (const bucket of ['school-logos', 'profile-photos']) {
    const { data: files } = await admin.storage.from(bucket).list('', { limit: 1000 });
    fs.mkdirSync(\`backup-\${bucket}\`, { recursive: true });
    for (const f of files ?? []) {
      const { data } = await admin.storage.from(bucket).download(f.name);
      if (data) fs.writeFileSync(\`backup-\${bucket}/\${f.name}\`, Buffer.from(await data.arrayBuffer()));
    }
  }
})();
"
```

This only lists one folder level — buckets here are organized as `${organization_id}/...`, so for a multi-school deployment you'd need to walk each org folder. For a single school this is usually one folder.

## Restore procedure

1. **New/empty Supabase project**: apply all migrations in `supabase/migrations/` in order (`supabase db push` against the new project, or paste each file into Studio's SQL Editor in filename order).
2. **Restore data**: run the dumped `.sql` file against the new project (`psql` via the connection string, or Studio's SQL Editor for smaller dumps).
3. **Restore storage**: re-upload the downloaded files to the same bucket names/paths using the Storage dashboard or the reverse of the download script above (`.upload()` instead of `.download()`).
4. **Update env vars**: point `.env.local` and the Vercel project at the new project's URL/keys if this was a full project recreation (not needed if you restored into the same project).
5. **Verify**: log in as an existing user, confirm a student record and its photo both load correctly.

## Why this matters

A single school's attendance records are the core value of this product — losing them isn't recoverable without a backup taken beforehand. Free tier gives no safety net by default, so the manual steps above are the only thing standing between an accident and permanent data loss until/unless the project upgrades to a paid plan with PITR.
