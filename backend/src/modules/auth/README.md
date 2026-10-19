# Authentication module

Registration, login, logout, current-user, password change, password recovery, and a protected-route example are implemented here using routes, validation and authentication middleware, controllers, services, and models. Apply the `users`, `sessions`, and `password_reset_tokens` table definitions in `database/schema.sql` before using the endpoints.

The registration endpoint creates users with `pending` status. An operator must activate accounts. Only active users can log in or receive password reset email. Reset tokens are random 32-byte secrets; only their SHA-256 digests are stored, and tokens expire after one hour and are single-use. Configure SMTP and `APP_BASE_URL` using the backend README before enabling email recovery.
