# TallerTrack: Patrones de Backend y Base de Datos

## Arquitectura del Repositorio (Monorepo)
- **Backend:** Node.js (>= v20), TypeScript. Ubicado en `/backend/src`.
- **Frontend:** React, TypeScript. Ubicado en `/frontend/src`.
- **Scripts:** Uso de `concurrently` para desarrollo.

## Base de Datos: PostgreSQL Estricto (RLS)
- **Aislamiento Multi-Tenant (CRÍTICO):** La base de datos usa `ROW LEVEL SECURITY (RLS)`.
- NUNCA escribas consultas SQL que ignoren el `tenant_id`.
- La aplicación DEBE establecer la variable de sesión antes de consultar: `SET app.current_tenant_id = '<uuid>';`
- **Tablas Principales:** `tenants`, `users`, `clients`, `vehicles`, `work_orders`, `quotes`, `quote_items`, `history_logs`.
- **Tipos ENUM existentes:** `work_order_status` ('received', 'diagnosing', 'awaiting_approval', 'approved', 'in_progress', 'awaiting_parts', 'completed', 'delivered', 'cancelled'), `quote_status`, `item_type`.

## Reglas de Negocio (Backend)
- **Inmutabilidad:** La tabla `history_logs` tiene reglas a nivel de base de datos (`no_update_history`, `no_delete_history`). NUNCA intentes hacer UPDATE o DELETE en esta tabla. Solo INSERT.
- **Triggers Activos:** Los campos `updated_at` se actualizan solos en la BD. El campo `subtotal` y `total` de `quotes` se recalcula automáticamente al insertar/modificar `quote_items`. No lo calcules en Node.js.
- **Estructura de Carpetas:** Mantén la lógica separada. Rutas en `/modules`, middlewares en `/middleware`, integraciones externas (IA, WhatsApp) en `/integrations`.