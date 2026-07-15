# RayoExpress API

Backend layer for trusted operations.

Planned responsibilities:

- health checks
- signed uploads
- secure callbacks
- audit logs
- privileged business actions

This package is intentionally separate from the frontend app.

## Current structure

- `api/health.ts`: readiness check
- `api/_shared/http.ts`: JSON helpers for API responses
- `lib/env.ts`: required server-side env validation
- `lib/supabase-admin.ts`: privileged Supabase client for server-only work

Use this layer for any operation that should not trust the browser:

- admin-only writes
- signed uploads
- webhook callbacks
- audit logging
- server-side role checks
