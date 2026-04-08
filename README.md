# Hardware Tracker

Production-minded hardware asset tracking platform for a single organization.

## Stack

- **Web:** Next.js 15, TypeScript, App Router
- **API:** NestJS 11, TypeScript, REST API
- **Database:** PostgreSQL 16
- **ORM:** Prisma
- **Auth:** email/password, JWT in HTTP-only cookie
- **Deploy:** Docker + Docker Compose
- **Exports:** CSV, Excel, PDF
- **QR:** generated QR per asset + browser QR scanning
- **Languages:** English + Estonian

## Repository layout

```text
/apps
  /api   NestJS backend
  /web   Next.js frontend
```

## Implemented features

### Roles
- `SUPERADMIN`
- `IT_ADMIN`
- `EMPLOYEE`

### Core modules
- authentication and secure cookie session
- role-based authorization
- admin dashboard
- users and role management
- asset CRUD and soft delete
- asset categories
- QR image generation and QR lookup
- assignment / return workflow with history
- maintenance workflow
- audit logging
- reports and export
- CSV / Excel import preview + commit
- employee self-service area
- bilingual UI

## Local development

### 1. Configure environment

```bash
cp .env.example .env
```

### 2. Install

```bash
pnpm install
```

### 3. Start PostgreSQL with Docker

```bash
docker compose up -d db
```

### 4. Run migrations and seed

```bash
pnpm --filter api exec prisma migrate dev --name init
pnpm prisma:seed
```

### 5. Start apps

```bash
pnpm dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:4000/api>
- Swagger docs: <http://localhost:4000/docs>

## Docker run

```bash
cp .env.example .env
docker compose up --build
```

## Automatic container publishing

GitHub Actions now publishes multi-arch images to GitHub Container Registry (GHCR):

- `ghcr.io/mvahur-sudo/hardware-tracker-api`
- `ghcr.io/mvahur-sudo/hardware-tracker-web`

Publishing rules:

- push to `main` → fresh branch and sha tags
- push tag `v*.*.*` → version tags + `latest`
- tag release also creates a GitHub Release automatically

## Seed users for local dev

All seed users use password:

```text
ChangeMe123!
```

Accounts:

- `superadmin@company.local`
- `itadmin@company.local`
- `mari@company.local`
- `john@company.local`
- `kadi@company.local`

## Important API endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/asset-categories`
- `GET /api/assets`
- `POST /api/assets`
- `GET /api/assets/:id`
- `PATCH /api/assets/:id`
- `GET /api/assets/:id/history`
- `GET /api/assets/:id/qr.png`
- `GET /api/assets/lookup/qr?value=...`
- `POST /api/assignments/assign`
- `POST /api/assignments/:id/return`
- `GET /api/maintenance`
- `POST /api/maintenance`
- `POST /api/maintenance/report-issue`
- `GET /api/audit-logs`
- `GET /api/reports/:key`
- `GET /api/reports/:key/export/:format`
- `GET /api/exports/assets?format=csv|xlsx|pdf`
- `GET /api/imports/assets/template?format=csv|xlsx`
- `POST /api/imports/assets/preview`
- `POST /api/imports/assets/commit`
- `GET /api/health`

## Prisma schema summary

Main entities:

- `User`
- `AssetCategory`
- `Asset`
- `Assignment`
- `MaintenanceRecord`
- `AuditLog`
- `ImportJob`

Enums include:

- user roles and locales
- asset statuses and conditions
- maintenance types and statuses
- import format and status

## Testing

### API unit tests

```bash
pnpm --filter api exec jest --runInBand
```

### API smoke e2e

```bash
cd apps/api
pnpm exec jest --config ./test/jest-e2e.json --runInBand
```

## Release process

First stable release tag format:

```bash
git tag v1.0.0
git push origin v1.0.0
```

That triggers:

- Docker build for API and Web
- push to GHCR
- GitHub Release generation

## Production notes

- use strong `JWT_SECRET`
- set real `APP_BASE_URL`
- run behind reverse proxy with HTTPS
- keep `sameSite=none` only when needed cross-site
- rotate seed credentials or disable them outside local development
- add proper Prisma SQL migrations before production rollout

## Assumptions

- single organization deployment
- self-hosted behind reverse proxy
- categories are extendable in schema but seeded with required defaults
- QR value uses `asset:<assetTag>` for stable lookup
- UTC timestamps are used internally through Postgres/Nest/Prisma defaults
