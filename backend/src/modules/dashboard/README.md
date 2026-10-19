# Main dashboard

The authenticated `/dashboard` page loads its profile and visible module links from `GET /api/dashboard`. Domain tiles are included only when the current session has that module's `view` grant; Superadmin is unrestricted. User Management and Rights Management are role-limited to Admin/Superadmin, and Superadmin Management is Superadmin-only.

All dashboard API routes and module pages require an active session and completed first-login password change. Both `GET /modules/:moduleKey` and the API endpoint (`GET /api/dashboard/modules/:moduleKey`) check the current view grant server-side. They return `403 PERMISSION_REQUIRED` when the grant is absent and `501 MODULE_NOT_IMPLEMENTED` after authorization while the domain modules are pending implementation. Apply `requirePermission(moduleKey, action)` to each future domain API endpoint; client-side hiding is not an access-control boundary.

Management pages and APIs have independent server-side auth/role checks. The dashboard document is stored under `views/` and served only after authentication; static JavaScript and CSS contain no sensitive data. The login page supports existing session authentication and the required first-login password change.
