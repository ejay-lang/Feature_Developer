# Superadmin management

The `/api/superadmin` routes require an active session, a completed first-login password change, and the `superadmin` role. Browser mutations also validate the request Origin.

The service supports pending-registration approval/rejection, User/Admin role changes, block/unblock, and disable/enable operations. Each operation validates the current role/status and records a user-management audit event in the same transaction. Status or role changes increment `session_version`, invalidating existing sessions.

Every role/status mutation locks the seeded `superadmin` role row before reading the active Superadmin count. This serializes concurrent application mutations and prevents demoting, blocking, or disabling the last active Superadmin. There is no account-deletion route; rejected registrations remain stored with status `rejected`.

Apply `database/migrations/004_superadmin_management.sql` after migrations 001–003 on an existing database. New installations get the `rejected` status and `user_management_audit` table from `database/schema.sql`.
