# HOPE System Backend

A modular Node.js and Express API using MySQL. It provides application configuration, health checks, centralized error handling, pending-account registration, session-based authentication, email-based password recovery, role-based user management, a permission-aware main dashboard, and a Superadmin dashboard for registration and account administration.

## Requirements

- Node.js 20 or newer and npm
- MySQL 8.0 or newer, installed and running locally

No Docker is required.

## Local setup

1. Create a local MySQL database:

   ```sql
   CREATE DATABASE hope_system
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   ```

2. From this directory, copy `.env.example` to `.env` and set the values for your local MySQL installation. Keep `.env` private and out of version control.

   ```powershell
   Copy-Item .env.example .env
   ```

3. Generate a unique session secret and place it in `.env`. In PowerShell, after Node is installed:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
   ```

4. Apply the schema in `database/schema.sql` to the `hope_system` database using your MySQL client (for example, open and run it in MySQL Workbench). The API waits for the persistent MySQL session store before listening and does not apply schema changes automatically.

   If you already created `users` from the previous starter schema, apply `database/migrations/001_auth_sessions.sql` once instead. This adds blocked status, password-change and session-version fields, plus the session table; existing accounts will be required to change their password at their next login.

5. Configure SMTP delivery and the externally reachable app URL in `.env`. `APP_BASE_URL` must be HTTPS in production. Use your provider's SMTP host and credentials; use port 465 with `SMTP_SECURE=true`, or a STARTTLS port such as 587 with `SMTP_SECURE=false`.

6. If the database already has the auth/session tables, apply `database/migrations/002_password_reset_tokens.sql` once. New databases get the reset table from `database/schema.sql`.

7. For existing installations, apply `database/migrations/003_user_management_rbac.sql` once. New databases get the role schema from `database/schema.sql`.

8. Apply `database/migrations/004_superadmin_management.sql` to existing installations. New databases get the rejected registration status and user-management audit table from `database/schema.sql`.

9. Apply `database/migrations/005_rights_management.sql` to existing installations. New databases get the seeded permissions catalog, `user_permissions`, and `audit_log` tables from `database/schema.sql`.

10. Install packages:

   ```powershell
   npm install
   ```

11. Start the development server:

   ```powershell
   npm run dev
   ```

   The API listens on `http://localhost:4000` by default. Nodemon restarts it when source files change.

12. Open the sign-in page at `http://localhost:4000/login`, registration at `http://localhost:4000/register`, or the password-recovery page at `http://localhost:4000/forgot-password`. After signing in and completing any required first-login password change, open the main dashboard at `http://localhost:4000/dashboard`. User Management and Rights Management require Admin or Superadmin; Superadmin Management requires Superadmin. To check the API and database connection:

   ```powershell
   Invoke-RestMethod http://localhost:4000/api/v1/health
   ```

   A healthy response has HTTP `200` and includes `"status": "ok"` and `"database": "ok"`. If MySQL is unavailable, the endpoint returns HTTP `503`.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime environment (`development`, `test`, or `production`). |
| `PORT` | `4000` | HTTP port. Must be a valid port number. |
| `CORS_ORIGIN` | `http://localhost:3000,http://localhost:4000` | Comma-separated browser origin allowlist for CORS and state-changing request origin checks. Requests without an `Origin` header are allowed for tools such as Postman. |
| `DB_HOST` | `localhost` | MySQL server hostname. |
| `DB_PORT` | `3306` | MySQL server port. |
| `DB_USER` | `root` | MySQL account. |
| `DB_PASSWORD` | empty | MySQL account password; set this for your local account. |
| `DB_NAME` | `hope_system` | Database name. |
| `DB_CONNECTION_LIMIT` | `10` | Maximum number of connections in the pool. |
| `SESSION_SECRET` | Required | Unique random secret of at least 32 UTF-8 bytes. Generate as shown above; never commit it. |
| `SESSION_NAME` | `hope.sid` | Session cookie name. |
| `SESSION_MAX_AGE_MS` | `28800000` | Session/cookie lifetime in milliseconds (8 hours). |
| `TRUST_PROXY` | `false` | Set to `true` only when deployed behind a trusted TLS-terminating reverse proxy. |
| `APP_BASE_URL` | `http://localhost:4000` | Public app origin used to build reset links; must be HTTPS in production. |
| `SMTP_HOST` | empty | SMTP server hostname. Required for reset email delivery. |
| `SMTP_PORT` | `587` | SMTP server port. |
| `SMTP_SECURE` | `false` | Set `true` for implicit TLS (commonly port 465); otherwise STARTTLS is required. |
| `SMTP_USER` | empty | SMTP account username; set together with `SMTP_PASS` if authentication is required. |
| `SMTP_PASS` | empty | SMTP account password. Keep it secret. |
| `SMTP_FROM` | example sender | Verified sender address/name used for reset emails. Required for delivery. |

Invalid numeric settings, an unsupported `NODE_ENV`, an invalid `TRUST_PROXY` or `SMTP_SECURE` value, a missing/example `SESSION_SECRET`, or missing SMTP host/sender configuration in production stop startup with an explicit configuration error.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Readiness check for the API and MySQL connection. |
| `POST` | `/api/auth/register` | Validate registration details and create a pending user. |
| `POST` | `/api/auth/login` | Verify credentials and create a server-side session for active users; rate-limited to 10 attempts per IP per 15 minutes. |
| `POST` | `/api/auth/logout` | Destroy the current session and clear its cookie. |
| `GET` | `/api/auth/me` | Return the current active user and password-change requirement. |
| `POST` | `/api/auth/change-password` | Change password for the current session; required on first login. |
| `GET` | `/api/auth/protected` | Example route requiring an active session and completed first-login password change. |
| `GET` | `/api/dashboard` | Return the signed-in profile and only the modules available to that user's role and View permissions. |
| `GET` | `/api/dashboard/modules/:moduleKey` | Enforce the module's View permission before returning the module status. Existing domain modules return `501 MODULE_NOT_IMPLEMENTED` after authorization until implemented. |
| `POST` | `/api/auth/forgot-password` | Request a one-hour, one-time reset link by email; responds generically to prevent account enumeration. |
| `POST` | `/api/auth/reset-password` | Validate a reset token and set a new password. |
| `GET` | `/api/users` | Search and page through manageable users. |
| `POST` | `/api/users` | Create a user with an initial password; first login requires password change. |
| `GET` | `/api/users/:id` | Read one manageable user. |
| `PATCH` | `/api/users/:id` | Edit name/email; Superadmin may also change role. |
| `POST` | `/api/users/:id/block` | Block an active manageable user. |
| `POST` | `/api/users/:id/unblock` | Restore a blocked manageable user. |
| `GET` | `/api/superadmin/summary` | Superadmin dashboard account totals. |
| `GET` | `/api/superadmin/users` | Search/filter/page all accounts (Superadmin only). |
| `GET` | `/api/superadmin/pending` | Page pending registrations (Superadmin only). |
| `POST` | `/api/superadmin/users/:id/approve` | Approve a pending registration. |
| `POST` | `/api/superadmin/users/:id/reject` | Reject and retain a pending registration record. |
| `POST` | `/api/superadmin/users/:id/promote` | Promote a User account to Admin. |
| `POST` | `/api/superadmin/users/:id/demote` | Demote an Admin account to User. |
| `PATCH` | `/api/superadmin/users/:id/role` | Set a non-pending User/Admin role to `user` or `admin`. |
| `POST` | `/api/superadmin/users/:id/block` | Block an active account. |
| `POST` | `/api/superadmin/users/:id/unblock` | Unblock a blocked account. |
| `POST` | `/api/superadmin/users/:id/disable` | Disable an active account. |
| `POST` | `/api/superadmin/users/:id/enable` | Re-enable a disabled account. |
| `GET` | `/api/rights/permissions` | Read the seeded module/action permission catalog (Admin/Superadmin). |
| `GET` | `/api/rights/users/:id/permissions` | View a manageable user's permissions. |
| `PUT` | `/api/rights/users/:id/permissions` | Replace a manageable user's permissions (audited transactionally). |
| `GET` | `/api/rights/users/:id/audit` | View the latest 50 permission-change audit entries for a manageable user. |

### Main dashboard and module access

The authenticated main dashboard is available at `/dashboard`; its API is `GET /api/dashboard`. The response contains a safe profile summary and a `modules` array. Customer, Product, Human Resources, Sales, and Reports appear only when the account has the corresponding `*.view` grant. Superadmin is unrestricted for those domain modules. User Management and Rights Management are shown only to Admin/Superadmin; Superadmin Management is shown only to Superadmin. Rights Management opens the existing User Management workspace, where an authorized operator selects a user's **Manage rights** action. The UI constructs its sidebar and module cards from this API response and does not treat client-side hiding as authorization.

All main-dashboard endpoints and module pages require an active session and completed first-login password change. Both `/modules/:moduleKey` and `GET /api/dashboard/modules/:moduleKey` check the live View grant server-side; an authenticated user without the grant receives `403 PERMISSION_REQUIRED`. Authorized module launches return `501 MODULE_NOT_IMPLEMENTED` because those domain modules are future work. Apply `requirePermission(moduleKey, action)` from `src/modules/rights/middleware/requirePermission.js` to every future domain API route and use the dashboard's view guard for its page route. User Management, Rights Management, and Superadmin Management page URLs are role guarded server-side, as are their APIs; Admin/User requests for Superadmin Management and User requests for the Admin-only areas return `403 FORBIDDEN`.

The dashboard profile/logout controls use the existing session endpoints. `/login` provides the browser sign-in flow and first-login password-change form; logout destroys the session and returns to sign-in. The dashboard document is served outside the public static directory and sent with no-store and a restrictive Content Security Policy.

All JSON errors use the shape `{"error":{"message":"...","details":[],"requestId":"..."}}`; `details` is included for field-validation errors. Unexpected errors are logged server-side and do not expose stack traces or database details to clients. Each response includes an `X-Request-Id` header.

Authentication uses `400` for validation or invalid reset-token errors, `401` for invalid/missing credentials, `403` for inactive accounts or a required password change, `409` for duplicate registration email, and `429` for throttled login/reset attempts. Responses include a stable `error.code` where applicable.

### Forgot and reset password

`POST /api/auth/forgot-password` accepts `{"email":"casey@example.com"}` and always returns `202` with the same generic message for eligible, ineligible, and unknown accounts. Only active accounts receive a reset email. Requests are limited to five per IP per 15 minutes and at most one token per account per minute.

```json
{
  "message": "If an active account exists for that email, password reset instructions will be sent shortly.",
  "requestId": "request-uuid"
}
```

The server generates a cryptographically random 32-byte token, stores only its SHA-256 hash, and emails the raw token in a reset link fragment (so the browser does not send it in the page request). Tokens expire after one hour; requesting a new token invalidates the previous one. Email delivery runs after the generic response to avoid leaking account existence through SMTP timing. SMTP delivery requires `SMTP_HOST` and `SMTP_FROM`; when delivery fails the server invalidates the token and logs a sanitized error. Graceful shutdown waits for queued email sends; for durable delivery through abrupt restarts or multiple instances, use a shared persistent job queue.

The reset form is available at `/reset-password`. It submits `token`, `newPassword`, and `confirmPassword` to `POST /api/auth/reset-password`. Passwords must be at least 12 characters and no more than 72 UTF-8 bytes and must match. Invalid, expired, or already-used tokens are rejected. A successful reset atomically updates the bcrypt hash, consumes the token, clears the first-login password-change requirement, and increments the user's session version to revoke existing sessions. Reset requests are rate limited to five per IP per 15 minutes.

Reset API request:

```json
{
  "token": "token-from-the-email-link",
  "newPassword": "UpdatedSecurePass789!",
  "confirmPassword": "UpdatedSecurePass789!"
}
```

The reset page uses `no-store`, a restrictive content security policy, and `no-referrer`; its client script removes the token from the address bar after reading it. Use HTTPS in production and configure SMTP credentials through the deployment secret store.

### Register a user

Request:

```json
{
  "firstName": "Casey",
  "lastName": "Example",
  "email": "casey@example.com",
  "password": "ExampleSecurePass123!",
  "confirmPassword": "ExampleSecurePass123!"
}
```

Passwords must be at least 12 characters and no more than 72 UTF-8 bytes (the bcrypt input limit). Names are trimmed and limited to 100 characters; email is trimmed, lowercased, and limited to 254 characters. All fields are required, and password confirmation must match exactly. Validation failures return `400` with field details, duplicate email returns `409`, and successful registration returns `201`. Passwords are hashed with bcrypt (12 salt rounds); `confirmPassword` is not stored. The response only includes the new user's public fields and `status: "pending"`.

Successful response:

```json
{
  "message": "Registration submitted. Your account is pending approval.",
  "user": {
    "id": "1",
    "firstName": "Casey",
    "lastName": "Example",
    "email": "casey@example.com",
    "status": "pending",
    "createdAt": "2026-10-19T10:00:00.000Z"
  }
}
```

The unique email constraint in MySQL is authoritative, so concurrent requests cannot create duplicate accounts. Email comparison is case-insensitive under the schema collation.

### Authentication and sessions

Only active users can log in; pending, rejected, blocked, and disabled accounts are rejected with `403` and an account-specific error code. Incorrect email/password combinations return the same `401` response.

Every new user starts with `must_change_password = 1`. After approval, the user's first valid login creates an `HttpOnly`, `SameSite=Lax` session cookie backed by the MySQL `sessions` table. In production the cookie is `Secure`; terminate TLS at the application or set `TRUST_PROXY=true` behind a trusted proxy. The API checks the current account status and session version against MySQL for protected requests. Password change requires the current password, a new password meeting the registration policy, and confirmation. It increments the session version to invalidate other sessions and clears the first-login requirement.

The `POST` authentication endpoints check an incoming browser `Origin` against `CORS_ORIGIN`; configure every trusted frontend origin. Postman/curl requests without an `Origin` header are accepted. Keep HTTPS enabled in production and use a long, unique session secret.

### User management and RBAC

All `/api/users` endpoints require an active session, a completed first-login password change, and the `admin` or `superadmin` role. A regular `user` receives `403 FORBIDDEN`.

Superadmin can list, read, create, edit, block, and unblock users across all roles. Admin can perform these actions only on non-pending, non-rejected role `user` accounts; the API list query hides Superadmin/Admin accounts and pending/rejected registrations, and direct requests against those records return `403 FORBIDDEN`. Admin cannot assign elevated roles. Pending and rejected registrations are reserved for Superadmin review. Every state-changing user-management request also enforces the configured `Origin` allowlist.

`GET /api/users?page=1&pageSize=20&search=casey` returns `users` and pagination metadata. Page starts at 1, page size defaults to 20 and is capped at 100, and search matches first/last/full name or email. Invalid pagination/search returns `400`.

`POST /api/users` requires `firstName`, `lastName`, `email`, and a 12-character minimum initial `password` (maximum 72 UTF-8 bytes); Superadmin may optionally provide role `user`, `admin`, or `superadmin`, while Admin may create only `user`. The account starts `active` with `mustChangePassword: true`; share the initial password securely out of band.

`PATCH /api/users/:id` accepts `firstName`, `lastName`, `email`, and optionally `role` for Superadmin. Blocking is separate: only `active` users can be blocked, only `blocked` users can be unblocked, and operators cannot block their own account. An active Superadmin cannot be demoted, blocked, or disabled if that would leave no active Superadmins. Role and status changes increment `session_version` to invalidate the affected user's sessions. Duplicate email returns `409`.

### Superadmin dashboard and approvals

Only a Superadmin with an active, authenticated session that has completed its first-login password change can access `/superadmin` or `/api/superadmin/*`. Admin and User roles receive `403 FORBIDDEN`. The dashboard provides paginated pending registrations, account search/status/role filters, summary totals, and actions to approve/reject registrations, promote/demote Admins, and block/unblock/disable/enable accounts.

Approving transitions `pending` to `active`; rejecting transitions `pending` to `rejected`. Rejected registrations remain in the database (the unique email stays reserved); this module does not expose account deletion. Block and disable are distinct status transitions from `active`; unblock and enable each return their corresponding account to `active`. An account cannot be both blocked and disabled at once. Role or status changes invalidate existing sessions and are recorded in `user_management_audit` within the same transaction.

All app-mediated role/status changes serialize on the seeded `superadmin` role row before checking/updating the active Superadmin count. The last active Superadmin cannot be demoted, blocked, or disabled; violations return `409 LAST_ACTIVE_SUPERADMIN` (or `LAST_SUPERADMIN` from the existing user-management PATCH route). This protection applies to both `/api/superadmin` and existing `/api/users` mutations. There is intentionally no account-deletion API. Provision the initial active Superadmin through a trusted one-time database-admin workflow before relying on the invariant; operational role/status changes must go through the API rather than direct SQL.

The dashboard list accepts `page`, `pageSize` (maximum 100), `search`, `status`, and `role`. The status filter supports `pending`, `active`, `blocked`, `disabled`, and `rejected`.

The role endpoint accepts `{"role":"admin"}` or `{"role":"user"}` for a non-pending, non-rejected User/Admin account; the dedicated promote/demote endpoints provide equivalent transitions. Invalid state transitions return `409 INVALID_STATUS_OR_ROLE_TRANSITION`. An operator cannot block or disable their own account (`409 CANNOT_RESTRICT_SELF`).

### Rights management

Rights Management is available from each eligible user row in the User Management page. Its modal loads the fixed permission catalog for Customer, Product, Human Resources, Sales, and Reports, each with View, Create, Edit, and Delete actions. Select All/Select None changes the checkbox set, and Save replaces that user's full permission set; opening the dialog reads the current set.

The API routes require an active session, completed first-login password change, and Admin or Superadmin role. Superadmin can view/change rights for any user. Admin can view/change rights only for regular accounts and receives `403 FORBIDDEN` for Superadmin/Admin accounts and pending/rejected registrations. User receives `403 FORBIDDEN`. Request payloads must contain a unique array of catalog codes such as `{"permissions":["customer.view","reports.create"]}`; an empty array removes all explicit permissions. Role-based Superadmin access is always unrestricted; its stored per-user grants do not restrict the role.

Permission changes replace rows in `user_permissions` and write `before_permissions`/`after_permissions`, actor and target IDs, and event type to `audit_log` in the same transaction. If audit insertion fails, the permission update rolls back. Saving an unchanged permission set returns `changed: false` and does not add a misleading change event. The latest 50 entries can be read through the audit endpoint. Audit snapshots contain permission codes, not credentials or other user data.

The reusable `requirePermission(moduleKey, action)` middleware is in `src/modules/rights/middleware/requirePermission.js` for applying rights to Customer/Product/HR/Sales/Reports routes as those modules are implemented. It checks the live grant in MySQL on each request and allows Superadmins. Mount it after authentication (and any applicable role checks) on each protected business route.

For existing databases, apply `database/migrations/005_rights_management.sql` after migrations 001–004. New databases get the same permission catalog and tables from `database/schema.sql`.

For an existing database, apply `database/migrations/003_user_management_rbac.sql` and then `database/migrations/004_superadmin_management.sql`. New databases get role tables, seeded roles, rejected status, and audit storage from `database/schema.sql`. Bootstrap the initial Superadmin from an account registered through `/register`:

```sql
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'superadmin'),
    status = 'active',
    must_change_password = 1
WHERE email = 'initial.admin@example.com';
```

Run this only through a trusted database-admin workflow. Set the account password through the reset-password flow or a separately controlled initial-credential process.

Login and password-reset throttling use the express-rate-limit in-memory store by default. For multi-process or multi-instance production deployments, configure its supported shared store so limits apply across all application instances.

Approve or reject registrations from the Superadmin dashboard; do not update account roles or statuses directly in SQL during normal operation.

### Postman examples

Import [`postman/HOPE-Register.postman_collection.json`](./postman/HOPE-Register.postman_collection.json) for registration examples. Import [`postman/HOPE-Authentication.postman_collection.json`](./postman/HOPE-Authentication.postman_collection.json) for login and session examples. Import [`postman/HOPE-Password-Reset.postman_collection.json`](./postman/HOPE-Password-Reset.postman_collection.json) to request a reset and verify validation, success, and token reuse rejection. Import [`postman/HOPE-User-Management.postman_collection.json`](./postman/HOPE-User-Management.postman_collection.json) for CRUD, search, pagination, status actions, and RBAC checks. Import [`postman/HOPE-Superadmin-Management.postman_collection.json`](./postman/HOPE-Superadmin-Management.postman_collection.json) for registration review, role/status actions, access denial, and last-active-Superadmin protections. Import [`postman/HOPE-Rights-Management.postman_collection.json`](./postman/HOPE-Rights-Management.postman_collection.json) for the permission catalog, permission view/save, audit history, validation, and role denials. Import [`postman/HOPE-Main-Dashboard.postman_collection.json`](./postman/HOPE-Main-Dashboard.postman_collection.json) for dashboard profile/module visibility and API/page permission-denial examples. Sign in first through the authentication collection; Postman shares its cookie jar for the same host. Use distinct `approvedPendingUserId` and `rejectedPendingUserId` values and set `lastActiveSuperadminId` to the sole active Superadmin when running invariant tests. For Admin rights tests, sign in as an Admin and use regular `userId` plus an actual `superadminUserId`; sign in as a User for the User-role denial request.

- Success: expects `201`, checks pending status and absence of password fields, and saves the created email.
- Invalid input: expects `400` with validation details.
- Duplicate email: expects `409`; run the success request first so the collection has an email to reuse.

## Project layout

```text
backend/
├── public/
│   ├── dashboard.css
│   ├── dashboard.js
│   ├── login.html
│   ├── login.js
│   ├── register.html
│   ├── register.js
│   ├── forgot-password.html
│   ├── forgot-password.js
│   ├── reset-password.html
│   ├── reset-password.js
│   ├── users.html
│   ├── users.css
│   ├── users.js
│   ├── superadmin.html
│   ├── superadmin.js
│   └── styles.css
├── postman/
│   ├── HOPE-Authentication.postman_collection.json
│   ├── HOPE-Password-Reset.postman_collection.json
│   ├── HOPE-Register.postman_collection.json
│   ├── HOPE-User-Management.postman_collection.json
│   ├── HOPE-Superadmin-Management.postman_collection.json
│   ├── HOPE-Rights-Management.postman_collection.json
│   └── HOPE-Main-Dashboard.postman_collection.json
├── database/
│   ├── migrations/
│   │   ├── 001_auth_sessions.sql
│   │   ├── 002_password_reset_tokens.sql
│   │   ├── 003_user_management_rbac.sql
│   │   ├── 004_superadmin_management.sql
│   │   └── 005_rights_management.sql
│   └── schema.sql
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   ├── database.js
│   │   ├── env.js
│   │   └── session.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   └── requestId.js
│   └── modules/
│       ├── auth/
│       │   ├── auth.controller.js
│       │   ├── auth.model.js
│       │   ├── auth.routes.js
│       │   ├── auth.service.js
│       │   ├── passwordReset.controller.js
│       │   ├── passwordReset.model.js
│       │   ├── passwordReset.service.js
│       │   ├── services/
│       │   │   └── email.service.js
│       │   └── middleware/
│       │       ├── requireAuth.js
│       │       ├── requirePasswordChanged.js
│       │       ├── loginRateLimit.js
│       │       ├── passwordResetRateLimit.js
│       │       ├── validateForgotPassword.js
│       │       ├── validateLogin.js
│       │       ├── validatePasswordChange.js
│       │       ├── validateRegistration.js
│       │       ├── validateResetPassword.js
│       │       └── verifyRequestOrigin.js
│       ├── dashboard/
│       │   ├── dashboard.controller.js
│       │   ├── dashboard.model.js
│       │   ├── dashboard.routes.js
│       │   ├── dashboard.service.js
│       │   ├── middleware/
│       │   │   └── requireModuleView.js
│       │   └── views/
│       │       ├── dashboard.html
│       │       └── module-not-implemented.html
│       ├── health/
│       ├── reports/
│       ├── roles/
│       ├── rights/
│       │   ├── README.md
│       │   ├── rights.controller.js
│       │   ├── rights.model.js
│       │   ├── rights.routes.js
│       │   ├── rights.service.js
│       │   └── middleware/
│       │       ├── requirePermission.js
│       │       └── validatePermissions.js
│       ├── superadmin/
│       │   ├── README.md
│       │   ├── superadmin.controller.js
│       │   ├── superadmin.model.js
│       │   ├── superadmin.routes.js
│       │   ├── superadmin.service.js
│       │   └── middleware/
│       │       ├── validateDashboardQuery.js
│       │       └── validateRoleChange.js
│       └── users/
│           ├── users.controller.js
│           ├── users.model.js
│           ├── users.routes.js
│           ├── users.service.js
│           └── middleware/
│               ├── allowRoles.js
│               ├── validateCreateUser.js
│               ├── validateUpdateUser.js
│               ├── validateUserId.js
│               └── validateUserList.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

The auth and user modules follow MVC/service separation: routes bind endpoints, middleware validates input and protects requests, controllers format HTTP responses, services implement business rules and hashing, models perform parameterized database queries, and dedicated services handle email delivery.

## Database schema

`database/schema.sql` defines seeded `roles`, `users` (case-insensitive unique email, bcrypt hash, account status including `rejected`, first-login flag, session version, role foreign key, and timestamps), persistent `sessions`, `password_reset_tokens` (SHA-256 token hash, unique user, expiry, creation time), `user_management_audit`, the seeded `permissions` catalog, `user_permissions` grants, and `audit_log` permission snapshots. Existing installations should apply migrations `001_auth_sessions.sql` through `005_rights_management.sql` in order. Extend the schema through reviewed migrations as the team defines remaining domain areas. The API does not mutate the database on startup.

## Production

Set `NODE_ENV=production`, configure the database with a least-privilege account, set `SESSION_SECRET` to a strong random value, set `CORS_ORIGIN` to only trusted frontend origins, configure HTTPS `APP_BASE_URL` and authenticated SMTP, and use HTTPS. Configure `TRUST_PROXY=true` only behind a trusted TLS-terminating proxy. Build deployment automation and migrations around your environment; do not commit `.env` or credentials. Start the service with:

```powershell
npm start
```
