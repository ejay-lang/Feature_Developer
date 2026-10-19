# Rights management

The `/api/rights` routes require an active authenticated Admin or Superadmin session with the first-login password change completed. User accounts receive `403 FORBIDDEN`. Admins can manage only regular accounts; the model rechecks actor and target roles/statuses inside a transaction so an Admin cannot read or alter Superadmin assignments.

The fixed permission catalog contains Customer, Product, Human Resources, Sales, and Reports, each with `view`, `create`, `edit`, and `delete`. `GET /permissions` returns the catalog. `GET /users/:id/permissions` reads the current grants. `PUT /users/:id/permissions` atomically replaces them with a unique array of permission codes; `[]` removes all explicit grants. Select All and Select None are client-side shortcuts that submit the same validated replacement API.

Each changed assignment inserts a `user.permissions.updated` row in `audit_log` in the same transaction as the grant replacement. If the audit insert fails, the permission update rolls back. Identical saves return `changed: false` without creating a false audit event. `GET /users/:id/audit` returns the most recent 50 permission-change records for a manageable target.

The exported `requirePermission(moduleKey, action)` middleware reads the current grant from MySQL on every request and bypasses individual grant checks for Superadmin. Mount it after authentication on applicable Customer/Product/Human Resources/Sales/Reports endpoints when those modules are implemented.

Apply `database/migrations/005_rights_management.sql` after migrations 001–004 to existing databases. New databases get the same seeded catalog and tables from `database/schema.sql`.
