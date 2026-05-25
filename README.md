# Dental SaaS — Multi-tenant Clinic Management Platform

Production-grade monorepo for managing dental clinic chains. Built with **hexagonal architecture**, **microfrontends**, and **CQRS** by design.

## Architecture

```
apps/
  shell/              # React shell (host) — Module Federation, port 5173
  mf-auth/            # Login microfrontend, port 5174
  mf-scheduling/      # Appointment calendar, port 5175
  mf-clinical/        # Patient records + Odontogram, port 5176
  mf-payments/        # Invoices & payments, port 5177
  mf-reports/         # KPI dashboard, port 5178

services/
  api-gateway/        # Fastify reverse proxy + JWT guard, port 3000
  identity-service/   # Auth, orgs, users, branches, port 3001
  scheduling-service/ # Appointments, availability slots, port 3002
  clinical-service/   # Patients, clinical records, odontogram, port 3003
  payments-service/   # Invoices, line items, payments, port 3004
  reminders-service/  # WhatsApp/SMS reminder scheduler, port 3005
  reporting-service/  # Dashboard KPIs, revenue reports, port 3006

packages/
  shared-kernel/      # Entity, AggregateRoot, ValueObject, Result, Guard
  contracts/          # Cross-service event interfaces

infrastructure/
  database/           # Prisma schema + seed
  docker/nginx/       # Nginx reverse proxy config
  k8s/                # Kubernetes manifests
```

### Multi-tenancy
Row-level via `organizationId` on every table. The API Gateway extracts the tenant from the JWT and downstream services scope **all** queries by `orgId`. Never trust request body for tenant scoping.

### Message Bus
RabbitMQ topic exchange `dental.events`. Routing key: `{service}.{entity}.{action}`.  
Example: `scheduling.appointment.created` → Reminders service subscribes and schedules 48h + 2h WhatsApp notifications.

## Prerequisites

- Node 20+, npm >=7
- Docker + Docker Compose

## Quick Start

```bash
# 1. Copy env
cp .env.example .env
# Edit .env with your DB URL, JWT secrets, WhatsApp API token

# 2. Start infrastructure
docker compose up postgres redis rabbitmq minio -d

# 3. Install deps
npm install

# 4. Run migrations + seed
npm run db:migrate
npm run db:seed

# 5. Start everything
npm run dev
```

Open http://localhost:5173 — login with `admin@dental-omar-sv.com` / `SuperSecure123!`

## Service Ports

| Service            | Port |
|--------------------|------|
| API Gateway        | 3000 |
| Identity           | 3001 |
| Scheduling         | 3002 |
| Clinical           | 3003 |
| Payments           | 3004 |
| Reminders          | 3005 |
| Reporting          | 3006 |
| Shell (frontend)   | 5173 |
| mf-auth            | 5174 |
| mf-scheduling      | 5175 |
| mf-clinical        | 5176 |
| mf-payments        | 5177 |
| mf-reports         | 5178 |
| PostgreSQL         | 5432 |
| Redis              | 6379 |
| RabbitMQ           | 5672 |
| RabbitMQ UI        | 15672 |
| MinIO              | 9000 |
| MinIO Console      | 9001 |

## Key Environment Variables

```env
DATABASE_URL=postgresql://dental:dental@localhost:5432/dental_saas
JWT_ACCESS_SECRET=<min-32-char-secret>
JWT_REFRESH_SECRET=<different-32-char-secret>
WHATSAPP_API_TOKEN=<Meta Cloud API token>
WHATSAPP_PHONE_NUMBER_ID=<Phone Number ID from Meta>
```

See `.env.example` for the full list.

## Production Deploy (Kubernetes)

```bash
# Build and push images
docker build -t dental/api-gateway:latest services/api-gateway
# ... (repeat per service)

# Apply manifests
kubectl apply -f infrastructure/k8s/namespace.yaml
kubectl apply -f infrastructure/k8s/services.yaml

# Create secrets
kubectl create secret generic dental-secrets \
  --from-env-file=.env \
  -n dental
```

## Business Modules

| Module | Description |
|--------|-------------|
| **Agenda de Citas** | Online booking, calendar view, conflict detection |
| **Recordatorios WhatsApp** | Automated 48h + 2h reminders via Meta Cloud API |
| **Expediente Digital** | Patient clinical history, FDI odontogram |
| **Pagos y Cobros** | Invoices with line items, partial/full payment tracking |
| **Dashboard** | Revenue by branch, appointment KPIs, no-show rates |
| **Multi-sucursal** | Hierarchical: SuperAdmin → Org → Branch |

## Role Hierarchy

```
SUPERADMIN > ORG_ADMIN > BRANCH_ADMIN > DOCTOR > RECEPTIONIST > PATIENT
```

## Live updates / Registro de cambios

Este archivo se mantendrá actualizado con los cambios relevantes del repositorio. Cambios recientes:

 - 2026-05-24: Ajustado para usar `npm` workspaces. Los scripts de base de datos (`db:migrate`, `db:seed`, `db:studio`) ejecutan los scripts del workspace `@dental/database` vía `npm --workspace=...`.
- 2026-05-24: Añadidos microfrontends `mf-clinical`, `mf-payments`, `mf-reports` y sus `vite.config.ts` / `package.json` básicos.
- 2026-05-24: Agregados despliegues K8s y `nginx.conf` en `infrastructure/`.

Comandos útiles (ahora con `npm`):

```bash
# instalar dependencias en la raíz (npm >=7 con workspaces)
npm install

# ejecutar migraciones y seed (desde la raíz)
npm run db:migrate
npm run db:seed

# abrir Prisma Studio
npm run db:studio
```

Si prefieres que mantenga un log más detallado de cada cambio (commits sugeridos, PRs, notas de despliegue), dime el formato y lo aplico.
