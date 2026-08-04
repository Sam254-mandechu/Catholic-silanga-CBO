# Supabase Setup — Step by Step

This guide walks you through configuring Supabase for the Catholic Silanga
CBO site, from a fresh project to a fully working backend with the
magic-admin email flow. Follow the steps in order — each builds on the
last.

---

## 1. Create a Supabase project (2 minutes)

1. Go to **https://supabase.com** and sign in (or sign up — free tier is
   plenty).
2. Click **"New Project"**.
3. Pick the **organisation** (default is your personal one).
4. Fill in:
   - **Name**: `catholic-silanga-cbo`
   - **Database password**: choose a strong one, **save it somewhere** —
     you'll need it later if you want to connect directly to Postgres.
   - **Region**: pick the one closest to your users (e.g. `eu-west-1`
     if your members are in East Africa).
5. Click **"Create new project"**. Wait ~1 minute for it to provision.

---

## 2. Grab your API keys (30 seconds)

You need two values from **Settings → API**:

| Key | Where to find it |
|---|---|
| `Project URL` | **Settings → API → Project URL** |
| `anon public` key | **Settings → API → Project API keys → `anon` `public`** |

Open the project's `.env` file and paste them:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
```

> The `anon` key is safe to put in client-side code — it's protected by
> Row Level Security (RLS) policies we set up in step 4. **Never** use the
> `service_role` key in the frontend.

---

## 3. Configure URL allow-list + email provider (1 minute)

### 3a. URL Configuration

Left sidebar → **Authentication** → **URL Configuration**.

| Field | Value |
|---|---|
| **Site URL** | `http://localhost:5173` (change to your real domain when deploying) |
| **Redirect URLs** | `http://localhost:5173/**` |

Click **Save**.

> When you deploy to production, add `https://your-real-domain.com` and
> `https://your-real-domain.com/**` to the same list.

### 3b. Disable email confirmation

Left sidebar → **Authentication** → **Providers** → **Email**.

Toggle **"Confirm email"** → **OFF**.

Click **Save**.

> Why: by default Supabase requires users to click a verification link
> before they can log in. If they don't see that email (spam folder, no
> SMTP configured), login fails silently. For our app the **admin's
> approval IS the verification step**, so email confirmation is redundant.

---

## 4. Run the database schema (3 minutes)

Left sidebar → **SQL Editor** → **New query**.

You need to run **three SQL files in order**. Each one builds on the
previous.

### 4a. Base schema

1. Open `supabase/schema.sql` from the project root.
2. Copy the entire contents.
3. Paste into the SQL Editor.
4. Click **"Run"** (or press `Ctrl+Enter`).
5. Wait for "Success. No rows returned".

### 4b. Tasks + payment methods

1. Open `supabase/schema_v2.sql`.
2. Copy → paste into a **new query** in the SQL Editor.
3. **Run**.

### 4c. Magic-admin allow-list + auto-promotion triggers

1. Open `supabase/schema_v3.sql`.
2. Copy → paste into a **new query** in the SQL Editor.
3. **Run**.

You should now see three new tables: `secret_admin_emails`, `tasks`,
`payment_methods`. Plus a new function: `promote_admin_by_email`.

---

## 5. Add your admin email to the allow-list (30 seconds)

In the SQL Editor, run:

```sql
insert into public.secret_admin_emails (email, note)
values ('youremail@example.com', 'Primary admin')
on conflict (email) do nothing;
```

Replace `youremail@example.com` with the email you'll use to register.
This email will **automatically become an admin** on first login.

> To add more admins later (e.g. your co-chair):
> ```sql
> insert into public.secret_admin_emails (email) values ('cochair@example.com');
> ```
> To remove one (and demote them back to member):
> ```sql
> delete from public.secret_admin_emails where email = 'cochair@example.com';
> update public.profiles set role = 'member' where email = 'cochair@example.com';
> ```

---

## 6. Configure Storage for the gallery (1 minute)

The site has a Gallery tab in the admin dashboard that uploads images.
You need one public storage bucket.

Left sidebar → **Storage** → **New bucket**.

| Field | Value |
|---|---|
| **Name** | `gallery` |
| **Public bucket** | ON ✅ |

Click **"Create bucket"**.

### Add an upload policy

In SQL Editor, run:

```sql
-- Allow authenticated users (admins) to upload to the gallery bucket
create policy "Admins can upload gallery images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery' and public.is_admin());

create policy "Admins can update gallery images"
  on storage.objects for update to authenticated
  using (bucket_id = 'gallery' and public.is_admin());

create policy "Admins can delete gallery images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'gallery' and public.is_admin());

-- Gallery images are public-readable (default for public buckets, but
-- make it explicit in case settings change later):
create policy "Gallery is public-readable"
  on storage.objects for select using (bucket_id = 'gallery');
```

---

## 7. Test the magic-admin flow (2 minutes)

1. Run the dev server: `npm run dev`
2. Open **http://localhost:5173/register**.
3. Register with the **same email** you added to `secret_admin_emails` in
   step 5.
4. You should see a gold **"Magic admin email detected"** banner above
   the email field.
5. After submitting, you'll be redirected to `/login`. The same banner
   will appear there.
6. Sign in. You should land directly on `/admin-dashboard`.

### Confirm in the database

In SQL Editor, run:

```sql
select email, role, status, hierarchy_role, verified_at
from public.profiles
where email = 'youremail@example.com';
```

You should see:
- `role = 'admin'`
- `status = 'active'`
- `hierarchy_role = 'Chairperson'`
- `verified_at` populated

### If it didn't promote automatically

The trigger should fire on first login. If it didn't, the fallback
`promote_admin_by_email` RPC should have kicked in. You can force-promote
manually from SQL:

```sql
select public.promote_admin_by_email('youremail@example.com');
```

---

## 8. Test the member-verification flow (2 minutes)

1. Register a **second** account with a different email (one NOT on the
   allow-list). Use a real email you can check (or use a friend's).
2. The user gets `status = 'pending'` and **cannot log in** until approved.
3. Log in as your admin account, go to `/admin-dashboard` → **Verification**.
4. You should see the pending user. Click **Review** → pick a hierarchy
   role → **Approve**.
5. The user's status flips to `active`. They can now log in.

---

## 9. (Optional) Inspect the database visually

Supabase has a built-in **Table Editor** that lets you browse and edit
data without SQL:

Left sidebar → **Table Editor** → pick a table.

Useful tables to check:
- `profiles` — all members
- `tasks` — admin-assigned tasks
- `donations` — pending + verified contributions
- `payment_methods` — admin-configured payment details
- `secret_admin_emails` — your admin allow-list

---

## 10. Deploy to production (when you're ready)

### Frontend (Netlify or Vercel — both free)

The easiest path is **Vercel**:

1. Push your code to GitHub (already done — `main` branch).
2. Go to **https://vercel.com** → **New Project** → import
   `Sam254-mandechu/Catholic-silanga-CBO`.
3. Vercel auto-detects Vite. Leave the defaults.
4. Add environment variables in **Settings → Environment Variables**:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `VITE_ADMIN_EMAIL` = your admin email (visual hint only)
5. Click **Deploy**. You'll get a URL like `catholic-silanga-cbo.vercel.app`.

### Update Supabase to allow your production domain

**Authentication → URL Configuration**:
- **Site URL**: `https://catholic-silanga-cbo.vercel.app`
- **Redirect URLs**: `https://catholic-silanga-cbo.vercel.app/**`

### Custom domain (optional)

If you bought a domain like `catholicsilanga.org`:

1. In Vercel → **Settings → Domains** → add your domain.
2. Update **Site URL** + **Redirect URLs** in Supabase to use the
   custom domain.
3. Supabase will send magic-link emails with your custom domain.

---

## Troubleshooting

### "Login doesn't work"

**Most common causes:**

1. **URL Configuration wrong.** Re-check step 3a — your domain must be in
   the allow-list.
2. **Email confirmation still on.** Re-check step 3b.
3. **`.env` not set.** Vite reads `.env` only on server start. Restart
   `npm run dev` after editing it.
4. **Wrong key copied.** Make sure you copied the **`anon public`** key,
   not the `service_role` key.

### "I registered but can't log in"

That's the **expected behavior** for non-admin emails — your account is
pending admin approval. Log in as your admin account and approve from
the Verification tab.

### "Magic admin didn't trigger"

1. Confirm your email is in the allow-list:
   ```sql
   select * from public.secret_admin_emails;
   ```
2. Try the manual RPC:
   ```sql
   select public.promote_admin_by_email('youremail@example.com');
   ```
3. Check the browser console — the frontend logs warnings when the
   RPC isn't found.

### "RLS error: row violates policy"

This means data was inserted/updated by an admin but a policy blocked
it. The most likely cause is `is_admin()` returning false because the
profile's role isn't `'admin'`. Check `select role from profiles where
email = '...'`.

### "Storage upload fails"

The bucket doesn't exist, or the policies in step 6 weren't applied.
Re-run those SQL statements.

---

## Quick reference

### Most useful SQL queries

```sql
-- Who's pending verification?
select email, display_name, national_id, member_code, joined_at
from public.profiles
where status = 'pending'
order by joined_at desc;

-- All admins
select email, display_name, hierarchy_role, verified_at
from public.profiles
where role = 'admin'
order by verified_at desc;

-- Total verified donations, by month
select
  date_trunc('month', created_at) as month,
  sum(amount) as total,
  count(*) as count
from public.donations
where status = 'completed'
group by 1
order by 1 desc;

-- Tasks assigned to a specific person
select t.title, t.status, t.priority, t.due_date
from public.tasks t
join public.profiles p on t.assignee_id = p.id
where p.email = 'someone@example.com'
order by t.due_date nulls last;
```

### Adding a new admin

```sql
insert into public.secret_admin_emails (email, note)
values ('newadmin@example.com', 'Co-chair');
```

### Removing an admin

```sql
delete from public.secret_admin_emails where email = 'oldadmin@example.com';
update public.profiles set role = 'member' where email = 'oldadmin@example.com';
```

---

## What you actually need to remember

The shortest possible summary:

1. **Disable email confirmation** (step 3b) — biggest source of "login
   doesn't work" complaints.
2. **Add your email to `secret_admin_emails`** (step 5) — this is what
   makes you admin automatically.
3. **Approve other users manually** from `/admin-dashboard` →
   **Verification**.

Everything else is set-and-forget.
