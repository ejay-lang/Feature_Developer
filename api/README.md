# HOPE System API scaffold

Node.js, Express, TypeScript, Supabase Auth client, and PostgreSQL starter API. This service is separate from the legacy JavaScript/MySQL service under `backend/` and the React/Supabase app under `frontend/`.

## Requirements

- Node.js 20.19 or newer and npm
- Supabase project with a PostgreSQL database
- No Docker required

## Local setup

1. In the Supabase dashboard, get the project's URL and anon/publishable key. Get a PostgreSQL **session pooler** connection string for the `DATABASE_URL`; do not place a service-role key in this application.
2. From this directory, create a local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Set `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`. Keep database credentials in `.env`, which is excluded from Git. Set `DB_SSL=true` when using hosted Supabase; leave it false only for a trusted local PostgreSQL server.
4. Install dependencies and start the API:

   ```powershell
   npm install
   npm run dev
   ```

5. Check readiness:

   ```powershell
   Invoke-RestMethod http://localhost:4000/api/health
   ```

The service checks the database before it begins listening. Nodemon is not required; `tsx watch` restarts the TypeScript server during development.

## Environment configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production`. |
| `HOST` | `0.0.0.0` | Network interface used by the HTTP listener. |
| `PORT` | `4000` | HTTP port (1–65535). |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated exact browser origin allowlist. Requests without an Origin header are accepted for health checks and CLI clients. |
| `DATABASE_URL` | Required | PostgreSQL connection URL. Prefer the Supabase session pooler for a long-lived Node service. |
| `DB_SSL` | `false` in development; `true` in production | Require TLS for PostgreSQL. |
| `DB_POOL_MAX` | `10` | Maximum PostgreSQL pool connections (1–100). |
| `SUPABASE_URL` | Required | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Required | Public anon/publishable key used by the server-scoped Supabase client. |

Configuration is validated on startup. Invalid URLs, ports, booleans, environment names, or missing required values stop startup with an explicit message.

## API

### `GET /api/health`

Runs `SELECT 1` through the PostgreSQL connection pool. It returns `200` when the database is reachable and `503` when it is unavailable. The response includes a request ID; failure responses do not disclose connection details.

Example success:

```json
{
  "status": "ok",
  "database": "ok",
  "timestamp": "2026-10-20T00:00:00.000Z",
  "requestId": "..."
}
```

Errors use the shape `{"error":{"code":"...","message":"...","requestId":"..."}}`. Unexpected server errors are logged with their request ID and return a generic message. Responses include an `X-Request-Id` header. Helmet sets standard security headers, JSON request bodies are limited to 1 MB, and CORS is restricted to configured origins.

## Supabase and database access

`src/config/supabase.ts` creates a server-side Supabase client with session persistence disabled and only the anon/publishable key. It does not use a `service_role` key. For future authenticated endpoints, create a request-scoped Supabase client that forwards the verified caller access token so PostgreSQL RLS remains in force.

`src/database/index.ts` owns a bounded `pg` connection pool for PostgreSQL connectivity and the readiness check. A direct database connection may bypass Supabase RLS when its PostgreSQL role owns tables or has `BYPASSRLS`; keep the connection string secret and use least-privileged roles. Prefer the RLS-aware Supabase client for end-user data access. Do not concatenate user input into SQL.

## Project structure

```text
api/
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   └── supabase.ts
│   ├── database/index.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   ├── notFound.ts
│   │   └── requestId.ts
│   ├── modules/
│   │   ├── health/health.controller.ts
│   │   └── README.md
│   ├── routes/
│   │   ├── health.routes.ts
│   │   └── index.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## Scripts

- `npm run dev` — run the API with TypeScript watch/restart.
- `npm run typecheck` — type-check without emitting.
- `npm run build` — compile to `dist/`.
- `npm start` — run the compiled server.

## Production checklist

- Set `NODE_ENV=production`, `DB_SSL=true`, and exact trusted CORS origins.
- Use Supabase session pooling, a least-privilege database role, and a managed secret store.
- Use caller-scoped Supabase clients for RLS-protected data access; never ship database credentials or service-role keys to clients.
- Terminate HTTPS at a trusted deployment edge and monitor health, startup, request, and shutdown logs.
