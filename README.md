# TallerTrack 🔧

Plataforma SaaS para gestión de talleres mecánicos.

## Stack

| Capa | Tecnología |
|---|---|
| Base de datos | PostgreSQL 17 + Row-Level Security |
| Backend | Node.js + TypeScript + Express |
| Frontend | React 18 + TypeScript + Tailwind CSS |

## Estructura

```
TallerTrack/
├── database/
│   ├── schema.sql               # Schema completo + RLS + triggers
│   ├── migrations/              # Migraciones incrementales
│   └── seeds/                   # Datos de prueba
├── backend/                     # API REST (puerto 3000)
│   └── src/
│       ├── modules/auth/        # Login + JWT
│       ├── modules/work-orders/ # Órdenes + máquina de estados
│       ├── integrations/        # WhatsApp (mock/meta) + QR
│       └── config/              # DB pool con RLS tenant context
└── frontend/                    # App del mecánico (puerto 5173)
    └── src/
        ├── screens/Dashboard/   # Kanban + búsqueda por patente
        ├── screens/NewOrder/    # Wizard 3 pasos
        └── screens/OrderDetail/ # Botones grandes + WhatsApp + QR
```

## Setup rápido

### 1. Base de datos
```bash
# Requiere PostgreSQL 17
psql -U postgres -c "CREATE DATABASE tallertrack;"
psql -U postgres -d tallertrack -f database/schema.sql
psql -U postgres -d tallertrack -f database/migrations/001_update_work_order_status_enum.sql
psql -U postgres -d tallertrack -f database/seeds/001_test_users.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # Editar DATABASE_URL y JWT_SECRET
npm install
npm run dev            # http://localhost:3000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

## Usuarios de prueba

| Email | Contraseña | Rol | Tenant |
|---|---|---|---|
| `owner@tallertrack.com` | `Admin1234!` | owner | taller-demo |
| `mecanico@tallertrack.com` | `Admin1234!` | mechanic | taller-demo |

## API — Endpoints principales

```
POST /api/v1/auth/login          # Login → JWT
GET  /api/v1/auth/me             # Perfil del usuario autenticado

GET  /api/v1/work-orders         # Listar órdenes (?status=)
POST /api/v1/work-orders         # Crear orden
GET  /api/v1/work-orders/:id     # Detalle
PATCH /api/v1/work-orders/:id/transition  # Cambiar estado
GET  /api/v1/work-orders/:id/qr  # QR code (PNG)
```

## Flujo de estados

```
received → diagnosing → [awaiting_parts →] in_progress → quality_control → ready → delivered
```
