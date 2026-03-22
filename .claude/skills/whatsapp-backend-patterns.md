# TallerTrack: Patrones del Servicio de WhatsApp

## Arquitectura de Integración
- **Ubicación:** El código de WhatsApp reside en `/backend/src/integrations/whatsapp` y `/whatsapp-direct`.
- **Objetivo:** Automatizar notificaciones a clientes ante cambios de estado en `work_orders`.

## Reglas de Estabilidad y Memoria (CRÍTICO)
- Las librerías de WhatsApp (Baileys/whatsapp-web.js) consumen mucha RAM y pueden bloquear el Event Loop.
- **Manejo de Errores:** Toda función de envío de mensajes debe estar en un bloque `try/catch`. Si un mensaje falla, loguea el error pero NUNCA tires el servidor abajo (`process.exit` o excepciones no controladas).
- **Aislamiento:** El envío de WhatsApp no debe bloquear la respuesta HTTP de la API al frontend. Si el mecánico cambia un estado, la API responde `200 OK` inmediatamente, y el mensaje de WhatsApp se procesa en segundo plano (asíncrono).

## Gestión Multi-Tenant de Sesiones
- El sistema debe soportar múltiples clientes de WhatsApp inicializados (uno por cada `tenant_id`).
- Las credenciales de sesión deben persistir (preferentemente en base de datos o volumen seguro) para evitar pedir el escaneo del código QR si el servidor Node.js se reinicia.