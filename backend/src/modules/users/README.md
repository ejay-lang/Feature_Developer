# User Management

Session-authenticated endpoints are mounted at `/api/users`. `Superadmin` can manage all roles; `Admin` can see and manage only non-pending, non-rejected `User` accounts; the `User` role receives `403 Forbidden`. Admin list queries filter to manageable accounts in SQL, and individual reads/mutations verify the target role/status both before and during writes.

New accounts are created as active with a bcrypt-hashed initial password and `must_change_password = 1`; deliver the initial password securely out of band. Status actions only allow active-to-blocked and blocked-to-active transitions. Role/status changes increment the session version, revoking existing sessions, and are recorded in `user_management_audit`. The transaction model prevents removing, blocking, or disabling the last active Superadmin.

Apply migrations `003_user_management_rbac.sql` and `004_superadmin_management.sql` to an existing installation, or create the full schema from `database/schema.sql`. Bootstrap the first Superadmin using the root README procedure. Review validation and response contracts in the root backend README and Postman collection before integrating another client.
