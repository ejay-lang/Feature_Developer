# Feature module structure

Create each business area under `src/modules/<feature>/` using the existing API layers:

```text
<feature>/
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
├── <feature>.routes.ts
├── middleware/
└── types/
```

Mount its routes from `src/routes/index.ts`. Keep request parsing/validation in middleware, HTTP translation in controllers, business rules in services, and persistence in repositories. Use Supabase clients carrying the authenticated user's access token for RLS-protected operations. Do not expose the PostgreSQL connection string or use elevated credentials in browser code.
