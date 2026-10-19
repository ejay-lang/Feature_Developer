# HOPE System registration frontend

This is a standalone React, TypeScript, and Vite registration application backed by Supabase Auth and PostgreSQL. It is separate from the legacy `backend/` Express/MySQL application; it does not call or modify that backend.

## Requirements

- Node.js 20.19 or newer and npm
- A Supabase project with email/password authentication enabled

## Configure Supabase

1. In the Supabase dashboard, enable **Authentication → Providers → Email**. Configure the email confirmation policy and SMTP delivery for production.
2. Add your development URL (for example `http://localhost:5173`) and production site URL to **Authentication → URL Configuration → Redirect URLs**.
3. Apply [`supabase/migrations/20261020000100_create_profiles.sql`](./supabase/migrations/20261020000100_create_profiles.sql) using the Supabase CLI (`supabase db push`) or the SQL editor. Do not apply a second, incompatible profiles schema.
4. Copy `.env.example` to `.env.local`, then set the project URL and the public publishable/anon key. Never use a Supabase `service_role` key in this browser application.

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173` by default.

## Registration behavior

The form validates trimmed first and last names (1–100 characters), email format and length, a password of at least 12 characters and no more than 72 UTF-8 bytes, and matching confirmation. It reports field errors, focuses the first invalid field, labels every control, and announces submission errors accessibly.

`src/services/authService.ts` calls `supabase.auth.signUp()` and sends the first/last names as user metadata. The PostgreSQL trigger creates a matching `profiles` row in the same transaction as the Auth user, with `role = 'user'` and `status = 'pending'`. The trigger validates required metadata and never accepts a role or status from the client. Signup success does not activate an account; an approved server-side workflow must update status through a trusted administrative path.

When email confirmation is enabled, Supabase requires the user to confirm their email before a session is issued. The UI uses a non-enumerating confirmation message and states that access remains pending. Configure `VITE_AUTH_REDIRECT_URL` if the confirmation link should return to a route other than the site root.

## PostgreSQL and Row Level Security

The migration creates `public.profiles` with a UUID primary key referencing `auth.users(id)`, first/last name, unique email, constrained role/status values, and timestamps. The `on_auth_user_created` trigger calls a `SECURITY DEFINER` function with an empty `search_path`; all table references are schema-qualified. The function inserts fixed role/status values and rejects missing or oversized signup metadata. Auth signup and profile insertion are atomic.

RLS is enabled. Authenticated users receive `SELECT` permission and a policy that exposes only their own row (`auth.uid() = id`). No client-side insert, update, or delete privilege/policy is granted, preventing users from changing their role or pending status. Anonymous users cannot read profiles. Add narrowly scoped, audited administrator policies only when a trusted administrative authorization design exists; never rely on editable user metadata or a client-supplied role.

## Project structure

```text
frontend/
├── src/
│   ├── components/RegisterForm.tsx
│   ├── lib/supabase.ts
│   ├── pages/Register.tsx
│   ├── services/authService.ts
│   ├── types/auth.ts
│   ├── vite-env.d.ts
│   ├── main.tsx
│   └── styles.css
├── supabase/migrations/20261020000100_create_profiles.sql
├── .env.example
├── index.html
└── package.json
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase publishable/anon key; protected by RLS, not a secret. |
| `VITE_AUTH_REDIRECT_URL` | Optional destination after email confirmation. Defaults to the app origin. |
| `VITE_SIGN_IN_URL` | Optional link to the sign-in application. When unset, the link is omitted. |

Vite embeds `VITE_*` variables into browser assets. Do not put service keys, database credentials, or secrets in these variables.

## Production checklist

- Configure Supabase Auth site/redirect URLs and authenticated SMTP.
- Enforce an appropriate minimum password policy in Supabase Auth as well as in the form.
- Keep public schema grants and RLS policies least-privileged; review all new policies before deployment.
- Never promote a user based on signup metadata. Perform approval and role changes through trusted server-side code or a carefully constrained administrative workflow.
- Serve the frontend over HTTPS and keep dependencies current.
