# RayoExpress Architecture

This repository is being organized into three layers:

## 1. Presentation

Client UI, admin UI, driver UI, and store UI. This stays in the frontend app.

## 2. Application API

Server-side routes and trusted business operations:

- secure callbacks
- webhook handling
- signed uploads
- privileged actions
- audit logging

This should live in a separate backend deployment.

## 3. Data

Supabase remains the source of truth for:

- auth
- relational business data
- realtime
- storage

## Deployment model

- Frontend: Vercel project A
- Backend API: Vercel project B
- Data: Supabase

## Security rules

- No secrets in client code
- RLS enabled for all business tables
- Sensitive operations go through the backend
- Storage access should use signed URLs or server-issued policies

