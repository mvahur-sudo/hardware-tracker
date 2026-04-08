# Implementation overview

## Architecture

- `apps/web`: Next.js App Router frontend for admin and employee portal
- `apps/api`: NestJS REST API with RBAC, audit logging, reporting, import/export
- PostgreSQL + Prisma for relational persistence
- HTTP-only cookie auth with JWT
- Docker Compose for local and self-hosted deployment

## Key backend modules

- `auth`
- `users`
- `me`
- `asset-categories`
- `assets`
- `assignments`
- `maintenance`
- `audit-logs`
- `reports`
- `imports`
- `exports`
- `health`

## Key frontend areas

- login
- dashboard
- assets list + asset detail
- users / roles
- reports
- audit logs
- employee my-assets page
- profile
- QR scan page

## Database design summary

- normalized user / asset / assignment / maintenance model
- audit history kept separately and never soft-deleted
- assets use soft delete via `deletedAt`
- current assignee denormalized on `Asset` for faster list filtering
- assignment history preserved in `Assignment`
- import preview/commit tracked in `ImportJob`

## Migration plan

1. initialize PostgreSQL and Prisma schema
2. create first migration from `apps/api/prisma/schema.prisma`
3. apply migration with `prisma migrate deploy`
4. seed required categories, users, sample assets, assignments, maintenance and audit logs
5. version future schema changes through incremental Prisma migrations

Example commands:

```bash
pnpm --filter api exec prisma migrate dev --name init
pnpm --filter api exec prisma migrate deploy
pnpm prisma:seed
```
