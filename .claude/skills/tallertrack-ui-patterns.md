# TallerTrack: Patrones de Interfaz y UI (Frontend)

## Arquitectura Frontend
- **Stack:** React, TypeScript, Tailwind CSS.
- **Ubicación:** `/frontend/src/` (Componentes en `/components`, vistas en `/screens`).
- **Navegación existente:** Dashboard, History, Landing, Login, NewOrder, OrderDetail, Billing.

## Contexto de Usuario (UX)
El usuario es un mecánico. La interfaz debe ser TÁCTIL, RÁPIDA y NO REQUERIR LECTURA DENSA.

## Estilo Visual y Componentes
- **Dark Mode Premium:** Usa colores oscuros (fondos azules-grises oscuros).
- **Acentos:** Naranja vibrante para llamadas a la acción (CTA) y botones primarios. Validaciones en verde/rojo tenues.
- **Tarjetas (Cards):** Estilo eskeuomórfico refinado. Bordes sutiles para simular metal o profundidad.
- **Componentes Táctiles:** Los botones deben ser grandes (mínimo `h-12` o `h-14` en Tailwind) para facilitar el toque en pantallas móviles.

## Reglas de Código Frontend
- Separa la lógica de presentación de la lógica de negocio (usa custom hooks).
- Tipado estricto: Usa interfaces de TypeScript que coincidan con el esquema de la base de datos (ej. enum `work_order_status`).